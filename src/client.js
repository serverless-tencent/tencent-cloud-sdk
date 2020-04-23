const assign = require('object-assign')
const qs = require('querystring')
const dotQs = require('dot-qs')
const request = require('../lib/request/index')
const crypto = require('crypto')
const cos = require('../lib/cos/cos')
const util = require('util')

var defaults = {
  signatureMethod: 'HmacSHA1',
  method: 'GET',
  Region: 'ap-guangzhou',
  protocol: 'https'
}

class TencentCloudClient {
  constructor(credentials = {}, service = {}) {
    this.credentials = credentials
    this.service = service
  }

  async cloudApiGenerateQueryString(data) {
    var param = assign(
      {
        Region: defaults.Region,
        SecretId: this.credentials.SecretId,
        Timestamp: Math.round(Date.now() / 1000),
        Nonce: Math.round(Math.random() * 65535),
        RequestClient: 'ServerlessFramework'
      },
      data
    )
    const token = this.credentials.token || this.credentials.Token
    if (token) {
      param.Token = token
    }
    if (this.credentials.token) {
      param.token = this.credentials.token
    }
    param.SignatureMethod = defaults.signatureMethod
    param = dotQs.flatten(param)
    const { host, path } = this.service
    var keys = Object.keys(param)
    var qstr = ''
    keys.sort()
    keys.forEach(function(key) {
      var val = param[key]
      if (key === '') {
        return
      }
      if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) {
        val = ''
      }
      qstr += '&' + (key.indexOf('_') ? key.replace(/_/g, '.') : key) + '=' + val
    })

    qstr = qstr.slice(1)

    const hmac = crypto.createHmac('sha1', this.credentials.SecretKey || '')
    param.Signature = hmac
      .update(new Buffer.from(defaults.method.toUpperCase() + host + path + '?' + qstr, 'utf8'))
      .digest('base64')

    return qs.stringify(param)
  }

  async doCloudApiRequest(data) {
    const httpBody = await this.cloudApiGenerateQueryString(data)

    // const options = {
    //   hostname: this.service.host,
    //   path: this.service.path + '?' + httpBody
    // }
    // return new Promise(function(resolve, reject) {
    //   const req = https.get(options, function(res) {
    //     res.setEncoding('utf8')
    //     res.on('data', function(chunk) {
    //       resolve(JSON.parse(chunk))
    //     })
    //   })
    //   req.on('error', function(e) {
    //     reject(e.message)
    //   })
    //   // req.write(httpBody)
    //   req.end()
    // })

    const url = `https://${this.service.host}${this.service.path}?${httpBody}`
    return new Promise(function(resolve, rejecte) {
      request(
        {
          url: url,
          method: 'GET'
        },
        function(error, response, body) {
          if (!error && response.statusCode == 200) {
            resolve(JSON.parse(body))
          }
          rejecte(error)
        }
      )
    })
  }
}

class ScfClient {
  constructor(credentials = {}) {
    this.credentials = credentials
  }
  async request(data) {
    return await new TencentCloudClient(this.credentials, {
      host: 'scf.tencentcloudapi.com',
      path: '/'
    }).doCloudApiRequest(data)
  }
}

class TagClient {
  constructor(credentials = {}) {
    this.credentials = credentials
  }
  async request(data) {
    return await new TencentCloudClient(this.credentials, {
      host: 'tag.tencentcloudapi.com',
      path: '/'
    }).doCloudApiRequest(data)
  }
}

class TcbClient {
  constructor(credentials = {}) {
    this.credentials = credentials
  }
  async request(data) {
    return await new TencentCloudClient(this.credentials, {
      host: 'tcb.tencentcloudapi.com',
      path: '/'
    }).doCloudApiRequest(data)
  }
}

class ApigwClient {
  constructor(credentials = {}) {
    this.credentials = credentials
  }
  async request(data) {
    return await new TencentCloudClient(this.credentials, {
      host: 'apigateway.api.qcloud.com',
      path: '/v2/index.php'
    }).doCloudApiRequest(data)
  }
}

class CamClient {
  constructor(credentials = {}) {
    this.credentials = credentials
  }
  async request(data) {
    return await new TencentCloudClient(this.credentials, {
      host: 'cam.tencentcloudapi.com',
      path: '/'
    }).doCloudApiRequest(data)
  }
}

class CamV2Client {
  constructor(credentials = {}) {
    this.credentials = credentials
  }
  async request(data) {
    return await new TencentCloudClient(this.credentials, {
      host: 'cam.api.qcloud.com',
      path: '/v2/index.php'
    }).doCloudApiRequest(data)
  }
}

class CnsClient {
  constructor(credentials = {}) {
    this.credentials = credentials
  }
  async request(data) {
    return await new TencentCloudClient(this.credentials, {
      host: 'cns.api.qcloud.com',
      path: '/v2/index.php'
    }).doCloudApiRequest(data)
  }
}

class DomainClient {
  constructor(credentials = {}) {
    this.credentials = credentials
  }
  async request(data) {
    return await new TencentCloudClient(this.credentials, {
      host: 'domain.tencentcloudapi.com',
      path: '/'
    }).doCloudApiRequest(data)
  }
}

class CosClient extends cos {}

class SlsMonitor {
  constructor(credentials = {}) {
    this.credentials = credentials
  }

  async request(data) {
    return await new TencentCloudClient(this.credentials, {
      host: 'monitor.tencentcloudapi.com',
      path: '/'
    }).doCloudApiRequest(data)
  }

  aggregationByDay(responses) {
    const len = responses.length
    for (var i = 0; i < len; i++) {
      const result = responses[i]
      const tlen = result.Response.DataPoints[0].Timestamps.length
      const values = result.Response.DataPoints[0].Values
      let total = values[0]

      const newTimes = []
      const newValues = []
      for (var n = 0; n < tlen; n++) {
        if (n > 0 && !(n % 24)) {
          newTimes.push(result.Response.DataPoints[0].Timestamps[n])
          const v = total / 24
          newValues.push(parseFloat((v.toFixed(2)), 10))
          total = values[n]
        } else {
          total += values[n]
        }
      }
      result.Response.DataPoints[0].Timestamps = newTimes
      result.Response.DataPoints[0].Values = newValues
    }
  }

  async getScfMetrics(region, rangeTime, period, funcName, ns, version) {
    const client = new TencentCloudClient(this.credentials, {
      host: 'monitor.tencentcloudapi.com',
      path: '/'
    })
    const req = {
      Action: 'GetMonitorData',
      Version: '2018-07-24',
    }

    const metrics = ['Duration', 'Invocation', 'Error', 'ConcurrentExecutions', 'ConfigMem', 'FunctionErrorPercentage', 'Http2xx', 'Http432', 'Http433', 'Http434', 'Http4xx', 'Mem', 'MemDuration', 'Syserr'];

    let aggrFlag = false
    if (period == 86400) {
      period = 3600 // day
      aggrFlag = true
    }
    const result = {
        rangeStart: rangeTime.rangeStart,
        rangeEnd: rangeTime.rangeEnd,
        metrics: []
    }
    
    const requestHandlers = []
    for (var i = 0; i < metrics.length; i++) {
        req.Namespace = 'qce/scf_v2';
        req.MetricName = metrics[i];
        req.Period = period;
        req.StartTime = rangeTime.rangeStart;
        req.EndTime = rangeTime.rangeEnd;
        req.Instances = [{ 
            Dimensions: [
                {
                    Name: 'functionName',
                    Value: funcName,
                },
                {
                    Name: 'version',
                    Value: version || '$latest',
                },
                {
                    Name: 'namespace',
                    Value: ns,
                }
            ]
        }];
        requestHandlers.push(client.doCloudApiRequest(req)) 
    }
    return new Promise((resolve, reject)=> {
        Promise.all(requestHandlers).then((results) => {
          if (aggrFlag) 
            this.aggregationByDay(results)

          resolve(results)
        }).catch((error) => {
            reject(error)
        })
    })
  }
}

module.exports = {
  ScfClient,
  TagClient,
  CamClient,
  CamV2Client,
  CnsClient,
  ApigwClient,
  DomainClient,
  CosClient,
  SlsMonitor,
  TcbClient
}
