# 腾讯云 SDK

## 云API 接口使用方法

```
const { apigw } = require('../lib/index')

const secret = {
  SecretId: '',
  SecretKey: ''
}

const apigwClient = new apigw(secret)

const data = {
    Action: 'DescribeServicesStatus'
}

apigwClient.request(data)

```

参考地址： https://cloud.tencent.com/document/api

## COS 接口使用方法

```
const { cos } = require('../lib/index')

const secret = {
  SecretId: '',
  SecretKey: ''
}

const cosClient = new cos(secret)

cosClient.getService(function(err, data) {
    console.log(err || data);
});
```

参考地址：https://cloud.tencent.com/document/product/436/8629
