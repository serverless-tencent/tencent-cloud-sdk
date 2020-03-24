const assign = require('object-assign')
const qs = require('querystring')
const dotQs = require('dot-qs')
const https = require('https')
const crypto = require('crypto')
const cos = require('./cos/cos')

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

  async sign(str, secretKey, signatureMethod = 'sha1') {
    var hmac = crypto.createHmac(signatureMethod, secretKey || '')
    return hmac.update(new Buffer.from(str, 'utf8')).digest('base64')
  }

  async generateQueryString(data) {
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
    if (this.credentials.token) {
      param.token = this.credentials.token
    }
    param.SignatureMethod = defaults.signatureMethod
    param = dotQs.flatten(param)
    var { host, path } = this.service
    var keys = Object.keys(param)
    var qstr = ''
    var signStr
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

    signStr = await this.sign(
      defaults.method.toUpperCase() + host + path + '?' + qstr,
      this.credentials.SecretKey
    )
    param.Signature = signStr

    return qs.stringify(param)
  }

  async doRequest(data) {
    const httpBody = await this.generateQueryString(data)
    const options = {
      hostname: this.service.host,
      path: this.service.path + '?' + httpBody
    }
    return new Promise(function(resolve, reject) {
      const req = https.get(options, function(res) {
        res.setEncoding('utf8')
        res.on('data', function(chunk) {
          resolve(JSON.parse(chunk))
        })
      })
      req.on('error', function(e) {
        reject(e.message)
      })
      // req.write(httpBody)
      req.end()
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
    }).doRequest(data)
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
    }).doRequest(data)
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
    }).doRequest(data)
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
    }).doRequest(data)
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
    }).doRequest(data)
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
    }).doRequest(data)
  }
}

class CosClient extends cos {}

module.exports = {
  ScfClient,
  TagClient,
  CamClient,
  CnsClient,
  ApigwClient,
  DomainClient,
  CosClient
}
