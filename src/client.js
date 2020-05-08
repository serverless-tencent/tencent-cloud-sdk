const assign = require('object-assign')
const qs = require('querystring')
const dotQs = require('dot-qs')
const request = require('../lib/request/index')
const crypto = require('crypto')
const cos = require('../lib/cos/cos')
const util = require('util')
const _ = require('lodash')

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

  mergeCustomByPeriod(datas, period) {
    const len = datas.length
    const newValues = []

    const val = {
      Timestamp: 0,
      Value: 0
    }
    for (var i = 0; i < len; i++) {
      const item = datas[i]
      if (i > 0 && !((i + 1) % period)) {
        let v = (val.Value + item.Value)
        if (!(~~v == v)) 
          v = parseFloat(v.toFixed(2), 10)
        newValues.push({
          Timestamp: val.Timestamp, 
          Value: v
        })
        val.Timestamp = 0
        val.Value = 0
      } else {
        if (val.Timestamp == 0)
          val.Timestamp = item.Timestamp
        val.Value += item.Value
      }
    }
    return newValues
  }

  mergeCustom5Min(datas) {
    return this.mergeCustomByPeriod(datas, 5)
  }

  mergeCustom5Min2Hours(datas) {
    return this.mergeCustomByPeriod(datas, 12)
  }

  mergeCustomHours2Day(datas) {
    return this.mergeCustomByPeriod(datas, 24)
  }

  mergeCustomHours(datas) {
    return this.mergeCustom5Min2Hours(this.mergeCustom5Min(datas))
  }

  mergeCustomDay(datas) {
    return this.mergeCustomHours2Day(this.mergeCustom5Min2Hours(this.mergeCustom5Min(datas)))
  }

  percentile(array, k) {
    const len = array.length
    if (len == 0)
      return 0

    if (len == 1)
      return array[0]

    const ret = (len - 1) * (k / 100)
    const i = Math.floor(ret)
    const j = ret % 1
    
    const val = (1 - j) * array[i] + j * array[i + 1]
    if (!(~~val == val)) {
      return parseFloat(val.toFixed(3), 10)
    }
    return val
  }

  aggrDurationP (responses, srcPeriod, dstPeriod) {
    if (srcPeriod == dstPeriod || srcPeriod > dstPeriod) 
      return

    const threshold = dstPeriod / srcPeriod
    const len = responses.length
    let times = []
    for (var i = 0; i < len; i++) {
      const result = responses[i]
      if (result.Response.Error) {
        console.log(JSON.stringify(result.Response.Error), result.Response.RequestId)
        continue
      }

      if (result.Response.MetricName != 'Duration') 
        continue
      
      if (i == 0) 
        times = responses[i + 1].Response.DataPoints[0].Timestamps
      else if (i == (len - 1)) 
        times = responses[i - 1].Response.DataPoints[0].Timestamps
      else
        times = responses[i + 1].Response.DataPoints[0].Timestamps

      const tlen = result.Response.DataPoints[0].Timestamps.length
      const values = result.Response.DataPoints[0].Values
      let total = []
      // let timestamp = 0
     
      const p95 = []
      const p50 = []
      for (var n = 0; n < tlen; n++) {
        if (n > 0 && !((n + 1) % threshold)) {
          total.push(values[n])
          total.sort((v1, v2) => {
            return v1 - v2
          })
          // times.push(timestamp)
          p95.push(this.percentile(total, 95))
          p50.push(this.percentile(total, 50))
          // timestamp = 0
          total = []
        } else {
          total.push(values[n])
          // if (timestamp == 0)
          //   timestamp = result.Response.DataPoints[0].Timestamps[n]
        }
      }
      if (tlen < threshold) {
        if (total.length > 0) {
          p95.push(this.percentile(total, 95))
          p50.push(this.percentile(total, 50))
        }
        times = [result.Response.DataPoints[0].Timestamps[n - 1]]
      }

      // if (timestamp != 0)
      //   times.push(timestamp)
      
      
      result.Response.MetricName = 'Duration-P50'
      result.Response.DataPoints[0].Timestamps = times
      result.Response.DataPoints[0].Values = p50
      result.Response.Period = dstPeriod

      // p95
      const p95Object = _.cloneDeep(result)
      result.Response.MetricName = 'Duration-P95'
      result.Response.DataPoints[0].Timestamps = times
      result.Response.DataPoints[0].Values = p95
      result.Response.Period = dstPeriod

      responses.push(p95Object)
    }

  }

  aggregationByDay(responses) {
    const len = responses.length
    for (var i = 0; i < len; i++) {
      const result = responses[i]
      if (result.Response.MetricName.match("Duration")) 
        continue

      const tlen = result.Response.DataPoints[0].Timestamps.length
      const values = result.Response.DataPoints[0].Values

      let total = 0
      let timestamp = 0
      const newTimes = []
      const newValues = []

      for (var n = 0; n < tlen; n++) {
        if (n > 0 && !((n + 1) % 24)) {
          newTimes.push(timestamp)
          timestamp = 0
          let v = (total + result.Response.DataPoints[0].Values[n]) / 24
          if (!(~~v == v)) 
            v = parseFloat(v.toFixed(2), 10)
          newValues.push(v)
          total = values[n]
        } else {
          total += values[n]
          if (timestamp == 0)
            timestamp = result.Response.DataPoints[0].Timestamps[n]
        }
      }
      result.Response.DataPoints[0].Timestamps = newTimes
      result.Response.DataPoints[0].Values = newValues
    }
  }

  aggrLatencyP(datas, srcPeriod, dstPeriod) {
    if (srcPeriod == dstPeriod || srcPeriod > dstPeriod) 
      return

    const len = datas.length
    const newValues = []

    const threshold = dstPeriod / srcPeriod

    let vals = []
    let timestamp = 0
     
    const times = []
    const p95 = []
    const p50 = []
    for (var n = 0; n < len; n++) {
      const item = datas[n]
      if (n > 0 && !((n + 1) % threshold)) {
        vals.push(item.Value)
        vals.sort((v1, v2) => {
          return v1 - v2
        })
        times.push(timestamp)
        p95.push(this.percentile(vals, 95))
        p50.push(this.percentile(vals, 50))
        timestamp = 0
        vals = []
      } else {
        vals.push(item.Value)
        if (timestamp == 0)
          timestamp = item.Timestamp
      }
    }

    return {
      Timestamps: times,
      P95: p95,
      P50: p50
    }
  }

  aggrCustomDatas(responses, period, metricAttributeHash) {
    const len = responses.length

    let latencyIdx = -1;
    let latencyDatas = null
    for (let i = 0; i < len; i++) {
      const response = responses[i]
      if (!response.Response.Data || response.Response.Data.length == 0)
        continue

      const attribute = metricAttributeHash[response.Response.Data[0].AttributeId]
      let newValues = response.Response.Data[0].Values
      if (attribute.AttributeName == 'latency') {
        responses[i].Response.Data[0].AttributeName = 'latency'
        latencyIdx = i
        latencyDatas = this.aggrLatencyP(newValues, 60, period)
        continue
      }
      
      switch (period) {
        case 300:
          newValues = this.mergeCustom5Min(response.Response.Data[0].Values)
          break
        case 3600:
          newValues = this.mergeCustomHours(response.Response.Data[0].Values)
          break
        case 86400:
          newValues = this.mergeCustomDay(response.
            Response.Data[0].Values)
          break
      }
      response.Response.Data[0].Values = newValues
      response.Response.Data[0].Period = period
      response.Response.Data[0].AttributeName = attribute.AttributeName
    }

    if (!(latencyIdx != -1 && latencyDatas != null)) 
      return 

    const newP95Vals = []
    const newP50Vals = []
    const tlen = latencyDatas.Timestamps.length
    for (let n = 0; n < tlen; n++) {
      newP95Vals.push({
        Timestamp: latencyDatas.Timestamps[n],
        Value: latencyDatas.P95[n]
      })
      newP50Vals.push({
        Timestamp: latencyDatas.Timestamps[n],
        Value: latencyDatas.P50[n]
      })
    }

    responses[latencyIdx].Response.Data[0].Period = period
    responses[latencyIdx].Response.Data[0].AttributeName = 'latency-P95'
    responses[latencyIdx].Response.Data[0].Values = newP95Vals

    const newP50 = _.cloneDeep(responses[latencyIdx])
    newP50.Response.Data[0].AttributeName = 'latency-P50'
    newP50.Response.Data[0].Values = newP50Vals

    responses.push(newP50)
  }

  async describeCCMInstanceDatas(id, instances, startTime, endTime) {
    const client = new TencentCloudClient(this.credentials, {
      host: 'monitor.tencentcloudapi.com',
      path: '/'
    })
    const req = {
      Action: 'DescribeCCMInstanceDatas',
      Version: '2018-07-24',
      AttributeId: id,
      InstanceName: instances,
      StartTime: startTime,
      EndTime: endTime,
      TypeId: 'SCF'
    }
    return client.doCloudApiRequest(req)
  }

  async describeAttributes(offset, limit) {
    const client = new TencentCloudClient(this.credentials, {
      host: 'monitor.tencentcloudapi.com',
      path: '/'
    })
    const req = {
      Action: 'DescribeAttributes',
      Version: '2018-07-24',
      Offset: offset || 0,
      Limit: limit || 10
    }

    return await client.doCloudApiRequest(req)
  }

  async getCustomMetrics(region, announceInstance, rangeTime, period) {
    const metricsRule = [
      /^(GET|POST|DEL|DELETE|PUT|OPTIONS|HEAD)_([a-zA-Z0-9]+)_latency$/i, 
      /^(GET|POST|DEL|DELETE|PUT|OPTIONS|HEAD)_([a-zA-Z0-9]+)_(\d+)$/i, 
      /^(GET|POST|DEL|DELETE|PUT|OPTIONS|HEAD)_([a-zA-Z0-9]+)$/i, 
      /^request$/i, /^latency$/i, /^error$/i, /^4xx$/i, /^5xx$/i]
    
    const filterAttributeName = function (name, metricsRule) {
      const len = metricsRule.length
      for (var i = 0; i < len; i++) {
        if (name.match(metricsRule[i]))
          return true
      }
    }
    const metricAttributeHash = {}
    const requestHandlers = []
    const attributes = await this.describeAttributes(0, 100)
    for (var i = 0; i < attributes.Response.Data.TotalCount; i++) {
      const metricAttribute = attributes.Response.Data.Data[i]

      if (filterAttributeName(metricAttribute.AttributeName, metricsRule)) {
        metricAttributeHash[metricAttribute.AttributeId] = metricAttribute
        requestHandlers.push(this.describeCCMInstanceDatas(metricAttribute.AttributeId, announceInstance, rangeTime.rangeStart, rangeTime.rangeEnd))
      }
    }

    return new Promise((resolve, reject)=> {
        Promise.all(requestHandlers).then((results) => {
          this.aggrCustomDatas(results, period, metricAttributeHash)
          resolve(results)
        }).catch((error) => {
          reject(error)
        })
    })
    
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

    const metrics = ['Invocation', 'Error', 'Duration']

    let durationPeriod
    const result = {
        rangeStart: rangeTime.rangeStart,
        rangeEnd: rangeTime.rangeEnd,
        metrics: []
    }
    
    const requestHandlers = []
    for (var i = 0; i < metrics.length; i++) {
        if (metrics[i] == 'Duration') {
          if (period == 3600) 
            req.Period = durationPeriod = 60
          else if (period == 86400)
            req.Period = durationPeriod = 3600
          else
            req.Period = durationPeriod = 60
        } else
            req.Period = period
        req.Namespace = 'qce/scf_v2'
        req.MetricName = metrics[i]
        
        req.StartTime = rangeTime.rangeStart
        req.EndTime = rangeTime.rangeEnd
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
        }]
        requestHandlers.push(client.doCloudApiRequest(req)) 
    }
    return new Promise((resolve, reject)=> {
        Promise.all(requestHandlers).then((results) => {
          this.aggrDurationP(results, durationPeriod, period)

          // if (aggrFlag) 
          //   this.aggregationByDay(results)

          resolve(results)
        }).catch((error) => {
            reject(error)
        })
    })
  }

  async createService() {
    const client = new TencentCloudClient(this.credentials, {
      host: 'monitor.tencentcloudapi.com',
      path: '/'
    })
    const req = {
      Action: 'CreateService',
      Version: '2018-07-24'
    }
    return client.doCloudApiRequest(req)
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
