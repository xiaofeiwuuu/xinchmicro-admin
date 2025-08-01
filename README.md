# API文档

## 目录

1. [通用说明](#通用说明)
2. [用户管理](#用户管理)
3. [公司信息](#公司信息)
4. [轮播图管理](#轮播图管理)
5. [日志管理](#日志管理)
6. [分类管理](#分类管理)
7. [产品目录管理](#产品目录管理)
8. [产品管理](#产品管理)
9. [文件上传](#文件上传)
10. [文件操作](#文件操作)
11. [手册管理](#手册管理)

## 通用说明

### 基础URL

所有API的基础URL为：`/api`

### 认证方式

除了特别说明的接口外，大部分接口都需要认证。认证方式为Bearer Token：

```
Authorization: Bearer {token}
```

token在登录接口中获取。

### 响应格式

所有接口的响应格式统一为：

```json
{
  "code": 0,         // 0表示成功，非0表示失败
  "message": "操作成功", // 提示信息
  "data": {}         // 返回的数据，可能是对象或数组
}
```

错误响应：

```json
{
  "code": -1,        // 错误码
  "message": "错误信息", // 错误描述
  "error": "详细错误信息" // 可选，详细错误信息
}
```

## 用户管理

### 登录

- **URL**: `/users/login`
- **方法**: `POST`
- **认证**: 不需要
- **请求体**:

```json
{
  "username": "admin",
  "password": "password123"
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "userType": "main"
    }
  }
}
```

### 创建主账号

- **URL**: `/users/main`
- **方法**: `POST`
- **认证**: 不需要
- **请求体**:

```json
{
  "username": "admin",
  "password": "password123"
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "主账号创建成功",
  "data": {
    "id": 1,
    "username": "admin",
    "userType": "main"
  }
}
```

### 修改密码

- **URL**: `/users/change-password`
- **方法**: `POST`
- **认证**: 需要
- **请求体**:

```json
{
  "oldPassword": "password123",
  "newPassword": "newpassword123"
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "密码修改成功"
}
```

### 创建子账号

- **URL**: `/users/sub`
- **方法**: `POST`
- **认证**: 需要（仅主账号）
- **请求体**:

```json
{
  "username": "subuser",
  "password": "password123"
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "子账号创建成功",
  "data": {
    "id": 2,
    "username": "subuser",
    "userType": "sub"
  }
}
```

### 获取用户列表

- **URL**: `/users`
- **方法**: `GET`
- **认证**: 需要（仅主账号）
- **响应**:

```json
{
  "code": 0,
  "message": "获取用户列表成功",
  "data": [
    {
      "id": 1,
      "username": "admin",
      "userType": "main"
    },
    {
      "id": 2,
      "username": "subuser",
      "userType": "sub"
    }
  ]
}
```

### 获取单个用户详情

- **URL**: `/users/:id`
- **方法**: `GET`
- **认证**: 需要（仅主账号或用户本人）
- **响应**:

```json
{
  "code": 0,
  "message": "获取用户详情成功",
  "data": {
    "id": 2,
    "username": "subuser",
    "userType": "sub"
  }
}
```

### 更新用户信息

- **URL**: `/users/:id`
- **方法**: `PUT`
- **认证**: 需要（仅主账号或用户本人）
- **请求体**:

```json
{
  "username": "newusername"
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "用户信息更新成功",
  "data": {
    "id": 2,
    "username": "newusername",
    "userType": "sub"
  }
}
```

### 删除用户

- **URL**: `/users/:id`
- **方法**: `DELETE`
- **认证**: 需要（仅主账号）
- **响应**:

```json
{
  "code": 0,
  "message": "用户删除成功"
}
```

### 重置用户密码

- **URL**: `/users/:id/reset-password`
- **方法**: `POST`
- **认证**: 需要（仅主账号）
- **请求体**:

```json
{
  "newPassword": "newpassword123"
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "密码重置成功"
}
```

## 公司信息

### 获取公司信息

- **URL**: `/company`
- **方法**: `GET`
- **认证**: 不需要
- **响应**:

```json
{
  "code": 0,
  "message": "获取公司信息成功",
  "data": {
    "id": 1,
    "name": "示例公司",
    "logo": "https://example.com/logo.png",
    "description": "公司简介",
    "address": "公司地址",
    "phone": "联系电话",
    "email": "联系邮箱"
  }
}
```

### 更新公司信息

- **URL**: `/company`
- **方法**: `PUT`
- **认证**: 需要
- **请求体**:

```json
{
  "name": "新公司名称",
  "logo": "https://example.com/newlogo.png",
  "description": "新公司简介",
  "address": "新公司地址",
  "phone": "新联系电话",
  "email": "新联系邮箱"
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "公司信息更新成功",
  "data": {
    "id": 1,
    "name": "新公司名称",
    "logo": "https://example.com/newlogo.png",
    "description": "新公司简介",
    "address": "新公司地址",
    "phone": "新联系电话",
    "email": "新联系邮箱"
  }
}
```

## 轮播图管理

### 获取轮播图列表

- **URL**: `/carousels`
- **方法**: `GET`
- **认证**: 不需要
- **响应**:

```json
{
  "code": 0,
  "message": "获取轮播图列表成功",
  "data": [
    {
      "id": 1,
      "title": "轮播图1",
      "imageUrl": "https://example.com/image1.jpg",
      "linkUrl": "https://example.com/link1",
      "order": 1
    },
    {
      "id": 2,
      "title": "轮播图2",
      "imageUrl": "https://example.com/image2.jpg",
      "linkUrl": "https://example.com/link2",
      "order": 2
    }
  ]
}
```

### 创建轮播图

- **URL**: `/carousels`
- **方法**: `POST`
- **认证**: 需要
- **请求体**:

```json
{
  "title": "新轮播图",
  "imageUrl": "https://example.com/newimage.jpg",
  "linkUrl": "https://example.com/newlink",
  "order": 3
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "轮播图创建成功",
  "data": {
    "id": 3,
    "title": "新轮播图",
    "imageUrl": "https://example.com/newimage.jpg",
    "linkUrl": "https://example.com/newlink",
    "order": 3
  }
}
```

### 更新轮播图

- **URL**: `/carousels/:id`
- **方法**: `PUT`
- **认证**: 需要
- **请求体**:

```json
{
  "title": "更新后的轮播图",
  "imageUrl": "https://example.com/updatedimage.jpg",
  "linkUrl": "https://example.com/updatedlink",
  "order": 1
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "轮播图更新成功",
  "data": {
    "id": 1,
    "title": "更新后的轮播图",
    "imageUrl": "https://example.com/updatedimage.jpg",
    "linkUrl": "https://example.com/updatedlink",
    "order": 1
  }
}
```

### 删除轮播图

- **URL**: `/carousels/:id`
- **方法**: `DELETE`
- **认证**: 需要
- **响应**:

```json
{
  "code": 0,
  "message": "轮播图删除成功"
}
```

### 更新轮播图顺序

- **URL**: `/carousels/order/batch`
- **方法**: `PUT`
- **认证**: 需要
- **请求体**:

```json
{
  "orders": [
    {"id": 1, "order": 2},
    {"id": 2, "order": 1}
  ]
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "轮播图顺序更新成功"
}
```

## 日志管理

### 获取日志列表

- **URL**: `/logs`
- **方法**: `GET`
- **认证**: 需要
- **查询参数**:
  - `username`: 用户名（可选）
  - `action`: 操作类型（可选）
  - `startDate`: 开始日期（可选）
  - `endDate`: 结束日期（可选）
  - `page`: 页码（默认1）
  - `pageSize`: 每页条数（默认20）
- **响应**:

```json
{
  "code": 0,
  "data": {
    "total": 100,
    "list": [
      {
        "id": 1,
        "userId": 1,
        "username": "admin",
        "userType": "main",
        "method": "POST",
        "path": "/api/categories",
        "action": "创建分类",
        "params": "{\"query\":{},\"body\":{\"name\":\"分类1\"},\"params\":{}}",
        "ip": "127.0.0.1",
        "status": 200,
        "error": null,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### 获取操作类型列表

- **URL**: `/logs/actions`
- **方法**: `GET`
- **认证**: 需要
- **响应**:

```json
{
  "code": 0,
  "message": "获取操作类型列表成功",
  "data": [
    "创建分类",
    "更新分类",
    "删除分类",
    "创建产品",
    "更新产品",
    "删除产品"
  ]
}
```

## 分类管理

### 获取所有分类

- **URL**: `/categories`
- **方法**: `GET`
- **认证**: 不需要
- **响应**:

```json
{
  "code": 0,
  "message": "获取分类列表成功",
  "data": [
    {
      "id": 1,
      "name": "分类1"
    },
    {
      "id": 2,
      "name": "分类2"
    }
  ]
}
```

### 获取单个分类

- **URL**: `/categories/:id`
- **方法**: `GET`
- **认证**: 不需要
- **响应**:

```json
{
  "code": 0,
  "message": "获取分类详情成功",
  "data": {
    "id": 1,
    "name": "分类1"
  }
}
```

### 创建分类

- **URL**: `/categories`
- **方法**: `POST`
- **认证**: 需要
- **请求体**:

```json
{
  "name": "新分类"
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "分类创建成功",
  "data": {
    "id": 3,
    "name": "新分类"
  }
}
```

### 更新分类

- **URL**: `/categories/:id`
- **方法**: `PUT`
- **认证**: 需要
- **请求体**:

```json
{
  "name": "更新后的分类"
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "分类更新成功",
  "data": {
    "id": 1,
    "name": "更新后的分类"
  }
}
```

### 删除分类

- **URL**: `/categories/:id`
- **方法**: `DELETE`
- **认证**: 需要
- **响应**:

```json
{
  "code": 0,
  "message": "分类删除成功"
}
```

## 产品目录管理

### 获取所有目录

- **URL**: `/catalogs`
- **方法**: `GET`
- **认证**: 不需要
- **响应**:

```json
{
  "code": 0,
  "message": "获取目录列表成功",
  "data": [
    {
      "id": 1,
      "name": "目录1",
      "categoryId": 1
    },
    {
      "id": 2,
      "name": "目录2",
      "categoryId": 1
    }
  ]
}
```

### 获取单个目录

- **URL**: `/catalogs/:id`
- **方法**: `GET`
- **认证**: 不需要
- **响应**:

```json
{
  "code": 0,
  "message": "获取目录详情成功",
  "data": {
    "id": 1,
    "name": "目录1",
    "categoryId": 1
  }
}
```

### 创建目录

- **URL**: `/catalogs`
- **方法**: `POST`
- **认证**: 需要
- **请求体**:

```json
{
  "name": "新目录",
  "categoryId": 1
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "目录创建成功",
  "data": {
    "id": 3,
    "name": "新目录",
    "categoryId": 1
  }
}
```

### 更新目录

- **URL**: `/catalogs/:id`
- **方法**: `PUT`
- **认证**: 需要
- **请求体**:

```json
{
  "name": "更新后的目录",
  "categoryId": 2
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "目录更新成功",
  "data": {
    "id": 1,
    "name": "更新后的目录",
    "categoryId": 2
  }
}
```

### 删除目录

- **URL**: `/catalogs/:id`
- **方法**: `DELETE`
- **认证**: 需要
- **响应**:

```json
{
  "code": 0,
  "message": "目录删除成功"
}
```

## 产品管理

### 获取所有产品

- **URL**: `/products`
- **方法**: `GET`
- **认证**: 不需要
- **查询参数**:
  - `catalogId`: 目录ID（可选）
  - `categoryId`: 分类ID（可选）
  - `keyword`: 关键词（可选）
  - `page`: 页码（默认1）
  - `pageSize`: 每页条数（默认20）
- **响应**:

```json
{
  "code": 0,
  "message": "获取产品列表成功",
  "data": {
    "total": 100,
    "list": [
      {
        "id": 1,
        "name": "产品1",
        "description": "产品描述",
        "imageUrl": "https://example.com/product1.jpg",
        "fileUrl": "https://example.com/product1.pdf",
        "catalogId": 1,
        "categoryId": 1
      }
    ],
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### 获取单个产品

- **URL**: `/products/:id`
- **方法**: `GET`
- **认证**: 不需要
- **响应**:

```json
{
  "code": 0,
  "message": "获取产品详情成功",
  "data": {
    "id": 1,
    "name": "产品1",
    "description": "产品描述",
    "imageUrl": "https://example.com/product1.jpg",
    "fileUrl": "https://example.com/product1.pdf",
    "catalogId": 1,
    "categoryId": 1
  }
}
```

### 创建产品

- **URL**: `/products`
- **方法**: `POST`
- **认证**: 需要
- **请求体**:

```json
{
  "name": "新产品",
  "description": "新产品描述",
  "imageUrl": "https://example.com/newproduct.jpg",
  "fileUrl": "https://example.com/newproduct.pdf",
  "catalogId": 1,
  "categoryId": 1
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "产品创建成功",
  "data": {
    "id": 2,
    "name": "新产品",
    "description": "新产品描述",
    "imageUrl": "https://example.com/newproduct.jpg",
    "fileUrl": "https://example.com/newproduct.pdf",
    "catalogId": 1,
    "categoryId": 1
  }
}
```

### 更新产品

- **URL**: `/products/:id`
- **方法**: `PUT`
- **认证**: 需要
- **请求体**:

```json
{
  "name": "更新后的产品",
  "description": "更新后的产品描述",
  "imageUrl": "https://example.com/updatedproduct.jpg",
  "fileUrl": "https://example.com/updatedproduct.pdf",
  "catalogId": 2,
  "categoryId": 2
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "产品更新成功",
  "data": {
    "id": 1,
    "name": "更新后的产品",
    "description": "更新后的产品描述",
    "imageUrl": "https://example.com/updatedproduct.jpg",
    "fileUrl": "https://example.com/updatedproduct.pdf",
    "catalogId": 2,
    "categoryId": 2
  }
}
```

### 删除产品

- **URL**: `/products/:id`
- **方法**: `DELETE`
- **认证**: 需要
- **响应**:

```json
{
  "code": 0,
  "message": "产品删除成功"
}
```

## 文件上传

### 获取上传授权

- **URL**: `/chunk-uploads/auth`
- **方法**: `POST`
- **认证**: 需要
- **请求体**:

```json
{
  "path": "example.pdf"
}
```

- **响应**:

```json
{
  "errcode": 0,
  "errmsg": "ok",
  "url": "https://example.com/upload",
  "token": "upload_token",
  "authorization": "auth_string",
  "file_id": "file_id",
  "cos_file_id": "cos_file_id",
  "key": "key"
}
```

## 文件操作

### 批量获取文件下载链接

- **URL**: `/files/download`
- **方法**: `POST`
- **认证**: 不需要
- **请求体**:

```json
{
  "file_list": [
    {
      "fileid": "cloud://prod-3gdwxhfn933cdfa7.7072-prod-3gdwxhfn933cdfa7-1234567890/example.pdf",
      "max_age": 7200
    }
  ]
}
```

- **响应**:

```json
{
  "code": 0,
  "data": {
    "file_list": [
      {
        "fileid": "cloud://prod-3gdwxhfn933cdfa7.7072-prod-3gdwxhfn933cdfa7-1234567890/example.pdf",
        "download_url": "https://example.com/download/example.pdf",
        "status": 0,
        "errmsg": "ok"
      }
    ]
  }
}
```

### 批量删除文件

- **URL**: `/files/delete`
- **方法**: `POST`
- **认证**: 需要
- **请求体**:

```json
{
  "fileid_list": [
    "cloud://prod-3gdwxhfn933cdfa7.7072-prod-3gdwxhfn933cdfa7-1234567890/example.pdf"
  ]
}
```

- **响应**:

```json
{
  "code": 0,
  "data": {
    "delete_list": [
      {
        "fileid": "cloud://prod-3gdwxhfn933cdfa7.7072-prod-3gdwxhfn933cdfa7-1234567890/example.pdf",
        "status": 0,
        "errmsg": "ok"
      }
    ]
  }
}
```

## 手册管理

### 获取手册列表

- **URL**: `/manuals`
- **方法**: `GET`
- **认证**: 需要
- **参数**:
  - `type` (可选): 手册类型，可选值：`product`（产品手册）、`safety`（安全手册）
  - `page` (可选): 页码，默认为1
  - `pageSize` (可选): 每页数量，默认为10
  - `keyword` (可选): 搜索关键词，按名称搜索

- **响应**:

```json
{
  "code": 0,
  "message": "获取手册列表成功",
  "data": {
    "total": 10,
    "list": [
      {
        "id": 1,
        "name": "产品使用手册",
        "type": "product",
        "fileId": "cloud://prod-3gdwxhfn933cdfa7.7072-prod-3gdwxhfn933cdfa7-1234567890/web/files/1615456789.pdf",
        "filePath": "web/files/1615456789.pdf",
        "createdAt": "2023-03-10T08:00:00.000Z",
        "updatedAt": "2023-03-10T08:00:00.000Z",
        "creator": {
          "id": 1,
          "username": "admin"
        },
        "updater": {
          "id": 1,
          "username": "admin"
        }
      }
    ],
    "page": 1,
    "pageSize": 10
  }
}
```

### 获取手册详情

- **URL**: `/manuals/:id`
- **方法**: `GET`
- **认证**: 需要
- **参数**:
  - `id`: 手册ID

- **响应**:

```json
{
  "code": 0,
  "message": "获取手册详情成功",
  "data": {
    "id": 1,
    "name": "产品使用手册",
    "type": "product",
    "fileId": "cloud://prod-3gdwxhfn933cdfa7.7072-prod-3gdwxhfn933cdfa7-1234567890/web/files/1615456789.pdf",
    "filePath": "web/files/1615456789.pdf",
    "createdAt": "2023-03-10T08:00:00.000Z",
    "updatedAt": "2023-03-10T08:00:00.000Z",
    "creator": {
      "id": 1,
      "username": "admin"
    },
    "updater": {
      "id": 1,
      "username": "admin"
    }
  }
}
```

### 创建手册

- **URL**: `/manuals`
- **方法**: `POST`
- **认证**: 需要
- **请求体**:

```json
{
  "name": "产品使用手册",
  "type": "product",
  "fileId": "cloud://prod-3gdwxhfn933cdfa7.7072-prod-3gdwxhfn933cdfa7-1234567890/web/files/1615456789.pdf",
  "filePath": "web/files/1615456789.pdf"
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "创建手册成功",
  "data": {
    "id": 1,
    "name": "产品使用手册",
    "type": "product",
    "fileId": "cloud://prod-3gdwxhfn933cdfa7.7072-prod-3gdwxhfn933cdfa7-1234567890/web/files/1615456789.pdf",
    "filePath": "web/files/1615456789.pdf",
    "createdBy": 1,
    "updatedBy": 1,
    "createdAt": "2023-03-10T08:00:00.000Z",
    "updatedAt": "2023-03-10T08:00:00.000Z"
  }
}
```

### 更新手册

- **URL**: `/manuals/:id`
- **方法**: `PUT`
- **认证**: 需要
- **参数**:
  - `id`: 手册ID
- **请求体**:

```json
{
  "name": "产品使用手册（更新版）",
  "fileId": "cloud://prod-3gdwxhfn933cdfa7.7072-prod-3gdwxhfn933cdfa7-1234567890/web/files/1615456790.pdf",
  "filePath": "web/files/1615456790.pdf"
}
```

- **响应**:

```json
{
  "code": 0,
  "message": "更新手册成功",
  "data": {
    "id": 1,
    "name": "产品使用手册（更新版）",
    "type": "product",
    "fileId": "cloud://prod-3gdwxhfn933cdfa7.7072-prod-3gdwxhfn933cdfa7-1234567890/web/files/1615456790.pdf",
    "filePath": "web/files/1615456790.pdf",
    "createdAt": "2023-03-10T08:00:00.000Z",
    "updatedAt": "2023-03-10T09:00:00.000Z",
    "creator": {
      "id": 1,
      "username": "admin"
    },
    "updater": {
      "id": 1,
      "username": "admin"
    }
  }
}
```

### 删除手册

- **URL**: `/manuals/:id`
- **方法**: `DELETE`
- **认证**: 需要
- **参数**:
  - `id`: 手册ID

- **响应**:

```json
{
  "code": 0,
  "message": "删除手册成功"
}
```