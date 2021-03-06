/* jshint expr: true */
var request = require('supertest');
var chai = require('chai');
var sinonChai = require('sinon-chai');
var sinon = require('sinon');
var irc = require('irc');
var createBots = require('../lib/helpers').createBots;
var testConfig = require('./single-test-config.json');

chai.use(sinonChai);
chai.should();

describe('/send', function() {
  var addListenerStub = sinon.stub();
  var sayStub = sinon.stub();

  before(function() {
    function clientStub() {}
    clientStub.prototype.addListener = addListenerStub;
    clientStub.prototype.say = sayStub;
    irc.Client = clientStub;

    process.env.CONFIG_FILE = process.cwd() + '/test/single-test-config.json';

    this.app = require('../lib/server');
  });

  afterEach(function() {
    sayStub.reset();
    addListenerStub.reset();
  });

  it('should return 403 for invalid tokens', function(done) {
    request(this.app)
      .post('/')
      .send('token=badtoken')
      .expect(403)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err) return done(err);
        var error = res.body;
        error.text.should.equal('Invalid hook token received');
        error.status.should.equal(403);
        sayStub.should.not.have.been.called;
        done();
      }.bind(this));
  });

  it('should return 200 for messages from slackbot', function(done) {
    var bodyParts = [
      'token=' + testConfig.outgoingToken,
      'user_id=USLACKBOT'
    ];
    var body = bodyParts.join('&');

    request(this.app)
      .post('/')
      .send(body)
      .expect(200)
      .end(function(err) {
        if (err) return done(err);
        sayStub.should.not.have.been.called;
        done();
      }.bind(this));
  });

  it('should try to send an irc message', function(done) {
    var channel = 'slack';
    var username = 'testuser';
    var message = 'hi';
    var bodyParts = [
      'token=' + testConfig.outgoingToken,
      'channel_name=' + channel,
      'user_name=' + username,
      'text=' + message
    ];
    var body = bodyParts.join('&');

    request(this.app)
      .post('/')
      .send(body)
      .expect(200)
      .end(function(err) {
        if (err) return done(err);

        var ircChannel = testConfig.channelMapping['#' + channel];
        sayStub.should.have.been.calledOnce;
        sayStub.should.have.been.calledWithExactly(ircChannel, '<' + username + '> ' + message);
        done();
      }.bind(this));
  });

});
