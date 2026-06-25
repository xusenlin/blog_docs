{
  "date": "2026.04.17 11:30",
  "tags": ["Go", "接口设计", "循环依赖", "架构"],
  "description": "通过 Wails 桌面应用开发中的循环依赖问题，深入理解 Go 接口设计的核心原则：接口定义在使用方，实现方无需感知。"
}
```

# Go 接口设计：循环依赖的根源与正确解法

## 从一个循环依赖说起

在 xAssistant 项目中，我写了这样的结构：

```go
// services — 定义了接口
type ModelRepository interface {
    Create(model *models.Model) error
    GetAll() ([]*models.Model, error)
    // ...
}

type ModelService struct {
    repo ModelRepository
}

// dao — 返回接口
func NewModelDAO(db *gorm.DB) services.ModelRepository {
    return &ModelDAO{db: db}
}
```

`main.go` 同时导入了 `dao` 和 `services`，结果编译报错：

```
import cycle not allowed
  services → dao → services
```

## 第一次错误尝试：接口下沉到 models

我把接口放到 `models/interfaces.go`，确实解决了循环依赖。但这不是最佳解法——**这只是规避了问题，而不是解决根本问题**。

## 重新理解 Go 的接口

关键在于理解 Go 的类型系统：

**Go 是 Structural Typing（结构化类型），而不是 Nominal Typing（名义类型）。**

```go
// dao 完全不知道任何接口存在
type ModelDAO struct { db *gorm.DB }

func (d *ModelDAO) Create(m *models.Model) error {
    return d.db.Create(m).Error
}
// ...实现所有方法
```

**`NewModelDAO` 根本不需要返回接口类型，直接返回 `*ModelDAO`：**

```go
// dao — 0 依赖，不需要 import services
func NewModelDAO(db *gorm.DB) *ModelDAO {
    return &ModelDAO{db: db}
}
```

## 正确的做法：接口定义在使用方

Go 的最佳实践是：**接口定义在消费者（consumer）包，而非生产者（producer）包。**

```go
// ========== services（接口定义方） ==========
package services

type ModelRepository interface {
    Create(model *models.Model) error
    GetByID(id string) (*models.Model, error)
    GetAll() ([]*models.Model, error)
    Update(model *models.Model) error
    Delete(id string) error
    GetEnabled() ([]*models.Model, error)
}

type Encrypter interface {
    Encrypt(plaintext string) (string, error)
    Decrypt(encrypted string) (string, error)
}

type ModelService struct {
    repo   ModelRepository
    crypto Encrypter
}

func NewModelService(repo ModelRepository, crypto Encrypter) *ModelService {
    return &ModelService{repo: repo, crypto: crypto}
}

// ========== dao（实现方，完全无感知） ==========
package dao

type ModelDAO struct { db *gorm.DB }

func NewModelDAO(db *gorm.DB) *ModelDAO {
    return &ModelDAO{db: db}
}
// ... 实现所有方法（不 import services，不知道任何接口存在）

// ========== main.go（组装） ==========
modelService := services.NewModelService(dao.NewModelDAO(db.DB), cryptoSvc)
```

`dao.NewModelDAO(db.DB)` 返回 `*ModelDAO`，Go 在调用 `NewModelService(repo ModelRepository)` 时自动检查 `*ModelDAO` 是否实现了 `ModelRepository` 接口。

## 依赖关系

```
models/   — 数据结构，无依赖
dao/      — 依赖 models，无依赖 services
services/ — 定义接口，依赖 models 和 dao
main/     — 组装所有包
```

无循环，方向单一。

## 为什么之前的做法是错的？

把接口定义在 `models/interfaces.go` 能工作，但埋了两个隐患：

1. **接口归属不清晰** — `models` 包本应是纯数据结构，突然多了业务接口，职责混乱
2. **假阳性安全感** — 以为解决了架构问题，实际上只是绕过了编译器

## 进一步的问题：真的需要接口层吗？

接口层的核心价值是**支持 mock 测试**：

```go
// 测试时注入 mock
type MockModelDAO struct{}
func (m *MockModelDAO) Create(model *models.Model) error { return nil }
// ...

modelService := services.NewModelService(&MockModelDAO{}, mockCrypto)
```

如果项目不需要 mock，接口层是纯粹的噪声：

```go
// 直接用 concrete 类型，更简单
type ModelService struct {
    dao *ModelDAO
}
```

对于 xAssistant 这个项目，保留接口层是为了未来测试灵活性，所以接口放在 `services` 包是标准做法。

## 三种流派对比

| 流派 | 接口位置 | 适用场景 |
|------|---------|---------|
| 接口在 services | 消费者包定义 | 需要 mock 的中小型项目（推荐） |
| 独立 repository 包 | `repository/interfaces.go` | 大型项目，多个消费者共享 |
| 无接口层 | 直接用 concrete | 小型项目，无测试需求 |

## 总结

Go 接口设计的**核心原则**只有一条：

> **接口定义在使用方，实现方无需感知。**

实现方（dao）只实现方法，不需要 import 任何东西。`NewXxxDAO` 返回 concrete 类型，在 `NewXxxService(repo XxxRepository)` 的参数位置由 Go 编译器自动验证接口实现是否满足。循环依赖的根源永远是包职责划分问题，而不是接口"应该放哪里"的语法问题。
