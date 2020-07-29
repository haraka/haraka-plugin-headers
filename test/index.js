
// node.js built-in modules
const assert   = require('assert');

// npm modules
const Address  = require('address-rfc2821');
const fixtures = require('haraka-test-fixtures');

// start of tests
//    assert: https://nodejs.org/api/assert.html
//    mocha: http://mochajs.org

beforeEach(function (done) {
  this.plugin = new fixtures.plugin('haraka-plugin-headers')
  this.plugin.register()

  try {
    this.plugin.addrparser = require('address-rfc2822');
  }
  catch (ignore) {}

  this.connection = fixtures.connection.createConnection();
  this.connection.transaction = fixtures.transaction.createTransaction();

  done()  // if a test hangs, assure you called done()
})

describe('haraka-plugin-headers', function () {
  it('loads', function (done) {
    assert.ok(this.plugin)
    done();
  })
})

describe('load_headers_ini', function () {
  it('loads headers.ini from config/headers.ini', function (done) {
    this.plugin.load_headers_ini()
    // console.log(this.plugin.cfg);
    assert.ok(this.plugin.cfg)
    done()
  })

  it('initializes enabled boolean', function (done) {
    this.plugin.load_headers_ini()
    assert.equal(this.plugin.cfg.check.duplicate_singular, true)
    done()
  })
})

describe('user_agent', function () {

  it('none', function (done) {
    const outer = this;
    this.plugin.cfg.check.user_agent=true;
    this.plugin.user_agent(function () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.equal(/UA/.test(r.fail), true);
      assert.equal(/UA/.test(r.pass), false);
      done()
    }, this.connection);
  })

  it('thunderbird', function (done) {
    const outer = this
    outer.plugin.cfg.check.user_agent=true
    outer.connection.transaction.header.add_end('User-Agent', 'Thunderbird')
    outer.plugin.user_agent(function () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers')
      // console.log(r)
      assert.equal(true, /UA/.test(r.pass))
      assert.equal(false, /UA/.test(r.fail))
      done()
    }, outer.connection)
  })

  it('X-mailer', function (done) {
    const outer = this
    outer.plugin.cfg.check.user_agent=true
    outer.connection.transaction.header.add_end('X-Mailer', 'Apple Mail');
    outer.plugin.user_agent(function () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.equal(true, /UA/.test(r.pass))
      assert.equal(false, /UA/.test(r.fail))
      done()
    }, outer.connection);
  })
})

describe('direct_to_mx', function () {

  it('auth user', function (done) {
    this.connection.notes.auth_user = 'test@example.com';
    const outer = this;
    this.plugin.cfg.check.direct_to_mx=true;
    this.plugin.direct_to_mx(function () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.equal(true, /^direct-to-mx/.test(r.skip));
      assert.equal(false, /^direct-to-mx/.test(r.pass));
      assert.equal(false, /^direct-to-mx/.test(r.fail));
      done()
    }, this.connection);
  })

  it('received 0', function (done) {
    const outer = this;
    this.plugin.cfg.check.direct_to_mx=true;
    this.plugin.direct_to_mx(function () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.equal(true, /^direct-to-mx/.test(r.fail));
      assert.equal(false, /^direct-to-mx/.test(r.pass));
      assert.equal(false, /^direct-to-mx/.test(r.skip));
    }, this.connection);
    done()
  })
  it('received 1', function (done) {
    const outer = this;
    this.plugin.cfg.check.direct_to_mx=true;
    this.connection.transaction.header.add_end('Received', 'blah');
    this.plugin.direct_to_mx(function () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.equal(true, /^direct-to-mx/.test(r.fail));
    }, this.connection);
    done()
  })
  it('received 2', function (done) {
    const outer = this;
    this.plugin.cfg.check.direct_to_mx=true;
    this.connection.transaction.header.add_end('Received', 'blah1');
    this.connection.transaction.header.add_end('Received', 'blah2');
    this.plugin.direct_to_mx(function () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.equal(true, /^direct-to-mx/.test(r.pass));
      assert.equal(false, /^direct-to-mx/.test(r.fail));
      assert.equal(false, /^direct-to-mx/.test(r.skip));
      done()
    }, this.connection);
  })
})

describe('from_match', function () {

  it('match bare', function (done) {
    const outer = this;
    this.plugin.cfg.check.from_match=true;
    this.connection.transaction.mail_from = new Address.Address('<test@example.com>');
    this.connection.transaction.header.add_end('From', 'test@example.com');
    this.plugin.from_match(function () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.notEqual(-1, r.pass.indexOf('from_match'));
      done()
    }, this.connection)
  })
  it('match typical', function (done) {
    const outer = this;
    this.plugin.cfg.check.from_match=true;
    this.connection.transaction.mail_from = new Address.Address('<test@example.com>');
    this.connection.transaction.header.add_end('From', '"Test User" <test@example.com>');
    this.plugin.from_match(function () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.notEqual(-1, r.pass.indexOf('from_match'));
      done()
    }, outer.connection);
  })
  it('match unquoted', function (done) {
    const outer = this;
    this.plugin.cfg.check.from_match=true;
    this.connection.transaction.mail_from = new Address.Address('<test@example.com>');
    this.connection.transaction.header.add_end('From', 'Test User <test@example.com>');
    this.plugin.from_match(function () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.notEqual(-1, r.pass.indexOf('from_match'));
      done()
    }, this.connection);
  })

  it('mismatch', function (done) {
    const outer = this;
    this.plugin.cfg.check.from_match=true;
    this.connection.transaction.mail_from = new Address.Address('<test@example.com>');
    this.connection.transaction.header.add_end('From', "test@example.net");
    // console.log(this.connection.transaction.results);
    this.plugin.from_match(function () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.equal(true, /^from_match/.test(r.fail));
      done()
    }, this.connection);
  })
})

describe('mailing_list', function () {

  it('ezmlm true', function (done) {
    const outer = this;
    function next_cb () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.equal(true, /ezmlm/.test(r.pass));
      assert.equal(0, r.fail.length);
    }
    this.plugin.cfg.check.mailing_list=true;
    this.connection.transaction.header.add_end('Mailing-List', "blah blah: run by ezmlm");
    this.plugin.mailing_list(next_cb, this.connection);
    done()
  })
  it('ezmlm false', function (done) {
    const outer = this;
    function next_cb () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.equal(r.pass.length, 0);
      assert.equal(true, /not/.test(r.msg));
    }
    this.plugin.cfg.check.mailing_list=true;
    this.connection.transaction.header.add_end('Mailing-List', "blah blah random header tokens");
    this.plugin.mailing_list(next_cb, this.connection);
    done()
  })
  it('yahoogroups', function (done) {
    const outer = this;
    function next_cb () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.equal(true, /yahoogroups/.test(r.pass));
    }
    this.plugin.cfg.check.mailing_list=true;
    outer.connection.transaction.header.add_end('Mailing-List', "blah blah such-and-such@yahoogroups.com email list");
    this.plugin.mailing_list(next_cb, this.connection);
    done()
  })
  it('majordomo', function (done) {
    const outer = this;
    function next_cb () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.equal(true, /majordomo/.test(r.pass));
    }
    this.plugin.cfg.check.mailing_list=true;
    outer.connection.transaction.header.add_end('Sender', "owner-blah-blah whatcha");
    outer.plugin.mailing_list(next_cb, outer.connection);
    done()
  })
  it('mailman', function (done) {
    const outer = this;
    outer.connection.transaction.header.add_end('X-Mailman-Version', "owner-blah-blah whatcha");
    function next_cb () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.equal(true, /mailman/.test(r.pass));
    }
    this.plugin.cfg.check.mailing_list=true;
    this.plugin.mailing_list(next_cb, this.connection);
    done()
  })
  it('majordomo v', function (done) {
    const outer = this;
    function next_cb () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.equal(true, /majordomo/.test(r.pass));
    }
    this.plugin.cfg.check.mailing_list=true;
    this.connection.transaction.header.add_end('X-Majordomo-Version', "owner-blah-blah whatcha");
    this.plugin.mailing_list(next_cb, this.connection);
    done()
  })
  it('google groups', function (done) {
    const outer = this;
    function next_cb () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.equal(true, /googlegroups/.test(r.pass));
    }
    this.plugin.cfg.check.mailing_list=true;
    this.connection.transaction.header.add_end('X-Google-Loop', "blah-blah whatcha");
    this.plugin.mailing_list(next_cb, this.connection);
    done()
  })
})

describe('delivered_to', function () {

  it('disabled', function (done) {
    const next_cb = function (res, msg) {
      assert.equal(undefined, res);
      assert.equal(undefined, msg);
      done()
    }.bind(this);
    this.plugin.cfg.check.delivered_to=false;
    this.plugin.delivered_to(next_cb, this.connection);
  })
  it('header not present', function (done) {
    const next_cb = function (res, msg) {
      assert.equal(undefined, res);
      assert.equal(undefined, msg);
      done()
    }.bind(this);
    this.plugin.cfg.check.delivered_to=true;
    this.plugin.delivered_to(next_cb, this.connection);
  })
  it('no recipient match', function (done) {
    const next_cb = function (res, msg) {
      assert.equal(undefined, res);
      assert.equal(undefined, msg);
      done()
    }.bind(this);
    this.plugin.cfg.check.delivered_to=true;
    // this.connection.transaction.mail_from = new Address.Address('<test@example.com>');
    this.connection.transaction.header.add_end('Delivered-To', "user@example.com");
    this.plugin.delivered_to(next_cb, this.connection);
  })
  it('recipient match', function (done) {
    const next_cb = function (res, msg) {
      assert.equal(DENY, res);
      assert.equal('Invalid Delivered-To header content', msg);
      done()
    }.bind(this);
    this.plugin.cfg.check.delivered_to=true;
    // this.connection.transaction.mail_from = new Address.Address('<test@example.com>');
    this.connection.transaction.header.add_end('Delivered-To', "user@example.com");
    this.connection.transaction.rcpt_to.push(new Address.Address('user@example.com'));
    this.plugin.delivered_to(next_cb, this.connection);
  })
  it('recipient match, reject disabled', function (done) {
    const next_cb = function (res, msg) {
      assert.equal(undefined, res);
      assert.equal(undefined, msg);
      done()
    }.bind(this);
    this.plugin.cfg.check.delivered_to=true;
    this.plugin.cfg.reject.delivered_to=false;
    // this.connection.transaction.mail_from = new Address.Address('<test@example.com>');
    this.connection.transaction.header.add_end('Delivered-To', "user@example.com");
    this.connection.transaction.rcpt_to.push(new Address.Address('user@example.com'));
    this.plugin.delivered_to(next_cb, this.connection);
  })
})

describe('from_phish', function () {

  it('passes typical', function (done) {
    const outer = this;
    this.plugin.cfg.check.from_phish=true;
    this.connection.transaction.mail_from = new Address.Address('<test@example.com>');
    this.connection.transaction.header.add_end('From', '"Test User" <test@example.com>');
    this.plugin.from_phish(function () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      assert.notEqual(r.pass.indexOf('from_phish'), -1);
      done()
    }, outer.connection);
  })

  it('fails when amazon.com is in the From header and not envelope sender', function (done) {
    const outer = this;
    this.plugin.cfg.check.from_phish=true;
    this.connection.transaction.mail_from = new Address.Address('<test@example.com>');
    this.connection.transaction.header.add_end('From', 'Amazon.com <test@ayodongbanyak08.com>');
    this.plugin.from_phish(function () {
      const r = outer.connection.transaction.results.get('haraka-plugin-headers');
      // console.log(r)
      assert.equal(r.fail.length, 1);
      done()
    }, this.connection);
  })
})