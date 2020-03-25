module.exports = {
  scf: require('./client').ScfClient,
  cam: require('./client').CamClient,
  cns: require('./client').CnsClient,
  tag: require('./client').TagClient,
  apigw: require('./client').ApigwClient,
  domain: require('./client').DomainClient,
  cos: require('./client').CosClient
}
