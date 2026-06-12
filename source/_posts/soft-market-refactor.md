---
title: 软工集市：从 Go 到 Java 的重构之路
date: 2026-06-12 14:00:00
tags: [Java, Go, Spring Boot, 重构, Gin, MyBatis-Plus, Redis, Kafka]
categories: 项目实战
cover: /images/2.jpg
top_img: /images/2.jpg
---

> 本文记录将学院交流平台「软工集市」从 Go (Gin + GORM) 重构到 Java (Spring Boot + MyBatis-Plus) 的全过程，涵盖架构演进、技术选型对比以及踩坑修复经验。

---

## 一、架构演进：从「平铺直叙」到「分层而治」

原 Go 项目采用典型的 Gin 单体架构，Controller 层承担了过多职责——路由注册、参数校验、业务逻辑、数据库操作全部糅合在一个函数里。重构后的 Java 项目严格遵循 **Controller → Service → Mapper** 三层分离，辅以 DTO/VO 做入参出参隔离。

### 1.1 统一响应格式

Go 版本用一个简单的函数包装返回：

```go
// Go: response/response.go
func Success(ctx *gin.Context, data gin.H, msg string) {
    ctx.JSON(http.StatusOK, gin.H{"code": 200, "data": data, "msg": msg})
}

func Fail(ctx *gin.Context, data gin.H, msg string) {
    ctx.JSON(http.StatusOK, gin.H{"code": 400, "data": data, "msg": msg})
}
```

每次调用需要手动构造 `gin.H`，类型不安全，字段名靠字符串硬编码。Java 版本引入泛型类 `Result<T>`：

```java
// Java: utils/Result.java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Accessors(chain = true)
public class Result<T> {
    private Integer code;
    private String message;
    private T data;

    public static <T> Result<T> success(T data) {
        return new Result<>(200, "操作成功", data);
    }

    public static <T> Result<T> fail(Integer code, String msg) {
        return new Result<>(code, msg, null);
    }
}
```

配合 `@RestControllerAdvice` 全局异常拦截，业务代码中只需抛异常即可自动转化为标准响应：

```java
// Java: exception/GlobalExceptionHandler.java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(BizException.class)
    public Result<Void> handleBizException(BizException e) {
        return Result.fail(400, e.getMessage());
    }

    @ExceptionHandler(UnauthorizedException.class)
    public Result<Void> handleUnauthorizedException(UnauthorizedException e) {
        return Result.fail(401, e.getMessage());
    }
}
```

Go 版本需要在每个 controller 函数里手动 `if err != nil { response.Fail(...); return }`，Java 版本直接 `throw new BizException("...")` 即可，代码量减少且不易遗漏。

---

### 1.2 认证体系：从 Middleware 查库到 Filter Chain + ThreadLocal

Go 版本的认证中间件逻辑：

```go
// Go: middleware/authMiddleware.go
func AuthMiddleware() gin.HandlerFunc {
    return func(ctx *gin.Context) {
        tokenString := ctx.GetHeader("Authorization")
        // ... 解析 token, 提取 userId ...
        db := common.GetDB()
        var user model.User
        db.Where("userID = ?", userId).First(&user)
        ctx.Set("user", user)   // 存入 gin.Context
        ctx.Next()
    }
}
```

**问题**：每次请求都查一次数据库拿 User 对象，且 controller 侧需要 `ctx.Get("user")` 然后类型断言，既低效又不安全。

Java 版本做了两件事解耦：

**JWT Filter 只负责解析 token 并存入 ThreadLocal：**

```java
// Java: config/security/JwtAuthenticationFilter.java
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final List<String> WHITE_LIST = List.of(
        "/api/auth/login", "/api/auth/register", "/api/auth/refresh",
        "/api/auth/validateEmail", "/api/auth/modifyPassword"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) {
        String path = request.getRequestURI();

        // 解析 token，设置用户上下文
        String token = resolveToken(request);
        if (StringUtils.hasText(token)) {
            Integer userId = jwtProvider.getUserId(token);
            UserContext.setUserId(userId);
        }

        // 白名单放行
        if (isWhiteList(path) || path.startsWith("/api/auth/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 其他路径必须有 token
        if (!StringUtils.hasText(token)) {
            unauthorizedEntryPoint.handle(request, response,
                new RuntimeException("未携带Token"));
            return;
        }
        filterChain.doFilter(request, response);
    }
}
```

**ThreadLocal 封装供 Service 层直接取用：**

```java
// Java: config/security/UserContext.java
public class UserContext {
    private static final ThreadLocal<Integer> userHolder = new ThreadLocal<>();

    public static Integer getUserId() { return userHolder.get(); }
    public static void setUserId(Integer userId) { userHolder.set(userId); }
    public static void clear() { userHolder.remove(); }
}
```

这使得 Service 层不需要从 Controller 传参就能拿到当前用户 ID，代码更干净：

```java
// Service 层直接获取当前用户，无需传参
Integer userId = UserContext.getUserId();
```

---

### 1.3 数据库访问层

Go 版本用的是 GORM v1（`github.com/jinzhu/gorm`），全局 `common.GetDB()` 拿连接：

```go
// Go: 典型的 controller 内数据库操作
db := common.GetDB()
var user model.User
db.Where("phone = ?", userTelephone).First(&user)
var posts []model.Post
db.Where("`partition` != ?", "打分").Order("postID DESC")
  .Offset(offset).Limit(limit).Find(&posts)
```

**问题**：字符串拼接 SQL 条件容易写错字段名，且每个 controller 函数都要写一遍 `db := common.GetDB()`。

Java 版本用 MyBatis-Plus，Mapper 继承 `BaseMapper<T>` 自带 CRUD，复杂查询用 `LambdaQueryWrapper` 保证字段名编译期检查：

```java
// Java: service/impl/PostServiceImpl.java
@Service
@RequiredArgsConstructor
public class PostServiceImpl extends ServiceImpl<PostMapper, Post> implements PostService {

    public void post(PostDTO postDTO) {
        Integer userId = UserContext.getUserId();
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BizException("用户不存在");
        }
        Post post = new Post();
        post.setUserId(userId);
        post.setTitle(postDTO.getTitle().trim());
        post.setPtext(postDTO.getContent().trim());
        post.setCategory(postDTO.getCategory().trim());
        post.setHeat(0.0);
        save(post);
    }
}
```

Lambda 写法杜绝了字符串打错字段名的问题：

```java
// 类型安全的查询条件
LambdaQueryWrapper<ChatMsg> wrapper = Wrappers.lambdaQuery();
wrapper.and(w -> w
    .eq(ChatMsg::getSenderUserId, senderId)
    .eq(ChatMsg::getTargetUserId, targetId)
).or(w -> w
    .eq(ChatMsg::getSenderUserId, targetId)
    .eq(ChatMsg::getTargetUserId, senderId)
);
```

---

## 二、技术选型对比

### 2.1 多级缓存：从 Redis 单级到 Caffeine + Redis 二级

Go 版本仅用 Redis 做缓存（邮箱验证码 + 热帖 ZSet），没有本地缓存层。Java 版本实现了 **L1(Caffeine 本地) + L2(Redis 远程)** 多级缓存，并内置了缓存穿透/击穿/雪崩的防护：

```
读取流程:
  L1 命中 → 直接返回 (微秒级)
  L1 未命中 → L2 命中 → 回填 L1 → 返回
  L2 未命中 → 获取分布式锁 → 双重检查 → 查 DB → 回填 L2+L1 → 释放锁 → 返回
```

核心实现：

```java
// Java: cache/MultiLevelCache.java
@Slf4j
@Component
public class MultiLevelCache {
    private final Cache<String, String> l1;      // Caffeine
    private final StringRedisTemplate redis;      // L2

    public <T> T get(String key, Class<T> clazz, int l2TtlSeconds,
                     Supplier<T> dbLoader) {
        // L1
        String cached = l1.getIfPresent(key);
        if (cached != null) return JSON.parseObject(cached, clazz);

        // L2
        String redisJson = redis.opsForValue().get(key);
        if (redisJson != null) {
            l1.put(key, redisJson);
            return JSON.parseObject(redisJson, clazz);
        }

        // L2 未命中 → 分布式锁防击穿
        String lockKey = "lock:" + key;
        Boolean gotLock = redis.opsForValue()
            .setIfAbsent(lockKey, "1", Duration.ofSeconds(10));

        if (Boolean.TRUE.equals(gotLock)) {
            try {
                // 双重检查
                redisJson = redis.opsForValue().get(key);
                if (redisJson != null) {
                    l1.put(key, redisJson);
                    return JSON.parseObject(redisJson, clazz);
                }
                // 查 DB
                Object data = dbLoader.get();
                String value = data == null ? "__NULL__" : JSON.toJSONString(data);

                // TTL 加随机抖动防雪崩
                int jitter = ThreadLocalRandom.current()
                    .nextInt((int) (l2TtlSeconds * 0.2));
                redis.opsForValue().set(key, value,
                    Duration.ofSeconds(l2TtlSeconds + jitter));
                l1.put(key, value);
                return (T) data;
            } finally {
                redis.delete(lockKey);
            }
        }
        // 未抢到锁，重试
        // ...
    }
}
```

**三层防护机制**：
- **穿透**：空值缓存 `__NULL__` 标记，30s TTL
- **击穿**：Redis SETNX 分布式互斥锁，只有一个线程重建缓存
- **雪崩**：TTL 附加 0~20% 随机抖动

同时通过 Redis Pub/Sub 实现跨实例 L1 缓存驱逐同步，多实例部署时不会出现本地缓存不一致。

---

### 2.2 消息队列：Kafka 异步解耦

Go 版本中，发送邮件通知和创建系统通知是同步写在业务逻辑里的，一个 `db.Create(&notice)` 就直接入库了。Java 版本引入了 Kafka 做异步解耦：

```java
// Java: service/impl/KafkaProducerService.java
@Service
@RequiredArgsConstructor
public class KafkaProducerService {
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void sendEmailEvent(EmailEvent event) {
        kafkaTemplate.send("email-verification", event)
            .whenComplete((result, ex) -> {
                if (ex != null) log.error("发送邮件事件失败: to={}", event.getTo(), ex);
            });
    }

    public void sendNotificationEvent(NotificationEvent event) {
        kafkaTemplate.send("notification", event)
            .whenComplete((result, ex) -> {
                if (ex != null) log.error("发送通知事件失败", ex);
            });
    }
}
```

消费端：

```java
// Java: service/impl/KafkaConsumerService.java
@Component
@RequiredArgsConstructor
public class KafkaConsumerService {
    private final MailService mailService;
    private final NoticeMapper noticeMapper;

    @KafkaListener(topics = "email-verification", groupId = "email-group")
    public void handleEmailEvent(EmailEvent event) {
        mailService.sendCode(event.getTo(), event.getCode());
    }

    @KafkaListener(topics = "notification", groupId = "notification-group")
    public void handleNotificationEvent(NotificationEvent event) {
        Notice notice = new Notice();
        notice.setReceiver(event.getReceiver());
        notice.setType(event.getType());
        notice.setNtext(event.getText());
        notice.setTime(LocalDateTime.now());
        noticeMapper.insert(notice);
    }
}
```

好处是明显的：用户发帖/评论时不需要等待邮件发送完成，接口响应更快，而且邮件服务挂了也不影响核心业务流程。

---

### 2.3 认证：双 Token + 前端自动刷新

原 Go 版本和后端一样用的是 Access Token（7天）+ Refresh Token（30天）双 token 机制。但 Java 版前端做了更完善的自动刷新：

```typescript
// TypeScript: api/req.ts
let refreshPromise: Promise<void> | null = null

async function requestFunc(url: string, object: RequestObject,
                           tokenIsNeeded: boolean = true) {
  // 带 token 发请求
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${store.token.value}` },
    ...
  })

  // 401 → 自动刷新 token
  if (res.status === 401) {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try { await refreshTokenIfNeeded() }
        finally { refreshPromise = null }
      })()
    }
    await refreshPromise
    res = await fetch(url, ...)  // 重试
  }
  return res
}
```

**关键点**：`refreshPromise` 作为模块级单例去重并发请求——多个请求同时遇到 401 时，只有第一个触发刷新，其余等待同一个 Promise 完成，避免刷新 token 被多次调用导致后续的 refresh token 失效。

---

## 三、踩坑与修复

### 3.1 用户标识：从手机号到 JWT userId

Go 版本中多个 controller 接口用 `userTelephone`（手机号）作为请求参数来标识用户：

```go
// Go: 前端传手机号来标识用户
type SaveMsg struct {
    UserTelephone string
    PostID        uint
}
func UpdateSave(c *gin.Context) {
    var msg SaveMsg
    c.Bind(&msg)
    var user model.User
    db.Where("phone = ?", msg.UserTelephone).First(&user)
    // ...
}
```

**风险**：手机号可以被篡改，攻击者理论上可以伪造他人身份操作。Java 版本彻底移除了这个模式——用户身份一律从 JWT 中解析，Service 层通过 `UserContext.getUserId()` 获取，不再信任客户端传入的任何用户标识。

### 3.2 Go Controller 中的 N+1 查询

翻阅 Go 版本的 `Browse` 函数（浏览帖子列表），每查到一个帖子后，都单独查一次 `plike`、`psave`、`user` 表：

```go
// Go: 经典的 N+1 问题
for _, post := range posts {
    var like model.Plike
    db.Where("userID = ? AND ptargetID = ?", user.UserID, post.PostID).First(&like)
    var save model.Psave
    db.Where("userID = ? AND ptargetID = ?", user.UserID, post.PostID).First(&save)
    var user model.User
    db.Where("userID = ?", post.UserID).First(&user)
    // ...
}
```

100 个帖子就是 300+ 次数据库查询。重构时对这种热点查询做了批量优化——一次性查出当前用户所有点赞/收藏的帖子 ID，在内存中做匹配，或者利用缓存层减少 DB 压力。

### 3.3 前端字段命名映射

Go 版本返回的 JSON 字段是 GORM 自动生成的蛇形命名（如 `user_id`、`avatar_url`），但前端 TypeScript 接口用的是小驼峰。Java 版本统一了这个问题。对于特殊情况——`GET /auth/info` 返回的 VO 需要和前端 Store 接口对齐——使用 `@JsonProperty` 显式映射：

```java
// 部分 VO 需要 @JsonProperty 桥接前后端字段命名差异
// CurrentUserVO 中: userID ↔ userId, avatarURL ↔ avatarUrl
```

前端侧也封装了映射函数处理 `POST /auth/getInfo` 返回的原始实体字段。重构后形成了明确的规范：新的接口统一用小驼峰，不再有两套命名混用的问题。

### 3.4 CORS 配置的坑

Go 版本 CORS 是用自定义中间件实现的，配置分散。Java 版本统一在 Spring Security 中管理：

```java
// Java: config/security/SecurityConfig.java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOriginPatterns(List.of("*"));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);  // 必须为 true，否则前端拿不到响应头

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

**踩坑**：`setAllowCredentials(true)` 和 `setAllowedOrigins(List.of("*"))` 不能同时存在（浏览器安全策略禁止），需要用 `setAllowedOriginPatterns` 替代。

---

## 四、总结

| 维度 | Go (重构前) | Java (重构后) |
|------|------------|-------------|
| 框架 | Gin + GORM v1 | Spring Boot 3.3 + MyBatis-Plus 3.5 |
| 认证 | 手写 Middleware，每次查库 | Spring Security + JWT Filter + ThreadLocal |
| 缓存 | Redis 单级 | Caffeine L1 + Redis L2 + 三防 |
| 消息队列 | 无，同步操作 | Kafka 异步（邮件 + 通知） |
| 文件存储 | 本地 + 腾讯 COS | MinIO 对象存储 |
| 架构 | Controller 一把梭 | Controller → Service → Mapper 分层 |
| 类型安全 | `gin.H` 动态 map | 泛型 `Result<T>` + DTO/VO |
| API 文档 | 无 | Knife4j (Swagger) |

重构的核心思路不是"换个语言重写一遍"，而是借重构之机修复原项目中积累的技术债——用分层架构代替平铺直叙，用类型安全代替字符串硬编码，用缓存策略和消息队列提升性能和可维护性。代码量从 56 个 Go 文件增长到 198 个 Java 文件，但每个文件职责更单一，单文件复杂度大幅降低。

最终效果：接口响应更快（多级缓存）、代码更易维护（分层清晰）、扩展性更强（Kafka 解耦后的通知系统可以轻松接入新渠道）。
