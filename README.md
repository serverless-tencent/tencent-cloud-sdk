# 腾讯云 SDK

## 云 API 接口使用方法

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

## Scf 监控接口

```
const { slsMonitor } = require('./src/index')

const slsClient = new slsMonitor(secret)

const rangeTime = {
    rangeStart: 'begin Time string rfc3339 format', // 2018-09-22T19:51:23+08:00
    rangeEnd: 'end Time string rfc3339 format' // 2018-09-22T19:51:23+08:00
}
const period = 3600
const ret = await slsClient.getScfMetrics('ap-guangzhou', rangeTime, period, 'funcName', 'default', '$latest')
console.log(ret)
```

参考地址: https://cloud.tencent.com/document/product/248/31649
