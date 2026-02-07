// node.js built-in modules
const assert = require('assert')

// npm modules
const Address = require('address-rfc2821').Address
const constants = require('haraka-constants')
const fixtures = require('haraka-test-fixtures')

// start of tests
//    assert: https://nodejs.org/api/assert.html
//    mocha: http://mochajs.org

beforeEach(function (done) {
  this.plugin = new fixtures.plugin('haraka-plugin-headers')
  this.plugin.register()

  try {
    this.plugin.addrparser = require('address-rfc2822')
  } catch (ignore) {}

  this.connection = fixtures.connection.createConnection()
  this.connection.init_transaction()

  done() // if a test hangs, assure you called done()
})

describe('haraka-plugin-headers', function () {
  it('loads', function (done) {
    assert.ok(this.plugin)
    done()
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
    this.plugin.cfg.check.user_agent = true
    this.plugin.user_agent(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(/UA/.test(r.fail), true)
      assert.equal(/UA/.test(r.pass), false)
      done()
    }, this.connection)
  })

  it('thunderbird', function (done) {
    this.plugin.cfg.check.user_agent = true
    this.connection.transaction.header.add_end('User-Agent', 'Thunderbird')
    this.plugin.user_agent(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      // console.log(r)
      assert.equal(true, /UA/.test(r.pass))
      assert.equal(false, /UA/.test(r.fail))
      done()
    }, this.connection)
  })

  it('X-mailer', function (done) {
    this.plugin.cfg.check.user_agent = true
    this.connection.transaction.header.add_end('X-Mailer', 'Apple Mail')
    this.plugin.user_agent(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /UA/.test(r.pass))
      assert.equal(false, /UA/.test(r.fail))
      done()
    }, this.connection)
  })
})

describe('direct_to_mx', function () {
  it('auth user', function (done) {
    this.connection.notes.auth_user = 'test@example.com'
    this.plugin.cfg.check.direct_to_mx = true
    this.plugin.direct_to_mx(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /^direct-to-mx/.test(r.skip))
      assert.equal(false, /^direct-to-mx/.test(r.pass))
      assert.equal(false, /^direct-to-mx/.test(r.fail))
      done()
    }, this.connection)
  })

  it('received 0', function (done) {
    this.plugin.cfg.check.direct_to_mx = true
    this.plugin.direct_to_mx(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /^direct-to-mx/.test(r.fail))
      assert.equal(false, /^direct-to-mx/.test(r.pass))
      assert.equal(false, /^direct-to-mx/.test(r.skip))
      done()
    }, this.connection)
  })
  it('received 1', function (done) {
    this.plugin.cfg.check.direct_to_mx = true
    this.connection.transaction.header.add_end('Received', 'blah')
    this.plugin.direct_to_mx(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /^direct-to-mx/.test(r.fail))
      done()
    }, this.connection)
  })
  it('received 2', function (done) {
    this.plugin.cfg.check.direct_to_mx = true
    this.connection.transaction.header.add_end('Received', 'blah1')
    this.connection.transaction.header.add_end('Received', 'blah2')
    this.plugin.direct_to_mx(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /^direct-to-mx/.test(r.pass))
      assert.equal(false, /^direct-to-mx/.test(r.fail))
      assert.equal(false, /^direct-to-mx/.test(r.skip))
      done()
    }, this.connection)
  })
})

describe('from_match', function () {
  it('match bare', function (done) {
    this.plugin.cfg.check.from_match = true
    this.connection.transaction.mail_from = new Address('<test@example.com>')
    this.connection.transaction.header.add_end('From', 'test@example.com')
    this.plugin.from_match(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.notEqual(-1, r.pass.indexOf('from_match'))
      done()
    }, this.connection)
  })
  it('match typical', function (done) {
    this.plugin.cfg.check.from_match = true
    this.connection.transaction.mail_from = new Address('<test@example.com>')
    this.connection.transaction.header.add_end('From', '"Test User" <test@example.com>')
    this.plugin.from_match(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.notEqual(-1, r.pass.indexOf('from_match'))
      done()
    }, this.connection)
  })
  it('match unquoted', function (done) {
    this.plugin.cfg.check.from_match = true
    this.connection.transaction.mail_from = new Address('<test@example.com>')
    this.connection.transaction.header.add_end('From', 'Test User <test@example.com>')
    this.plugin.from_match(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.notEqual(-1, r.pass.indexOf('from_match'))
      done()
    }, this.connection)
  })

  it('mismatch', function (done) {
    this.plugin.cfg.check.from_match = true
    this.connection.transaction.mail_from = new Address('<test@example.com>')
    this.connection.transaction.header.add_end('From', 'test@example.net')
    // console.log(this.connection.transaction.results);
    this.plugin.from_match(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /^from_match/.test(r.fail))
      done()
    }, this.connection)
  })
})

describe('mailing_list', function () {
  it('ezmlm true', function (done) {
    this.plugin.cfg.check.mailing_list = true
    this.connection.transaction.header.add_end('Mailing-List', 'blah blah: run by ezmlm')
    this.plugin.mailing_list(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /ezmlm/.test(r.pass))
      assert.equal(0, r.fail.length)
      done()
    }, this.connection)
  })
  it('ezmlm false', function (done) {
    this.plugin.cfg.check.mailing_list = true
    this.connection.transaction.header.add_end('Mailing-List', 'blah blah random header tokens')
    this.plugin.mailing_list(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(r.pass.length, 0)
      assert.equal(true, /not/.test(r.msg))
      done()
    }, this.connection)
  })
  it('yahoogroups', function (done) {
    this.plugin.cfg.check.mailing_list = true
    this.connection.transaction.header.add_end('Mailing-List', 'blah blah such-and-such@yahoogroups.com email list')
    this.plugin.mailing_list(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /yahoogroups/.test(r.pass))
      done()
    }, this.connection)
  })
  it('majordomo', function (done) {
    this.plugin.cfg.check.mailing_list = true
    this.connection.transaction.header.add_end('Sender', 'owner-blah-blah whatcha')
    this.plugin.mailing_list(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /majordomo/.test(r.pass))
      done()
    }, this.connection)
  })
  it('mailman', function (done) {
    this.connection.transaction.header.add_end('X-Mailman-Version', 'owner-blah-blah whatcha')
    this.plugin.cfg.check.mailing_list = true
    this.plugin.mailing_list(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /mailman/.test(r.pass))
      done()
    }, this.connection)
  })
  it('majordomo v', function (done) {
    this.plugin.cfg.check.mailing_list = true
    this.connection.transaction.header.add_end('X-Majordomo-Version', 'owner-blah-blah whatcha')
    this.plugin.mailing_list(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /majordomo/.test(r.pass))
      done()
    }, this.connection)
  })
  it('google groups', function (done) {
    this.plugin.cfg.check.mailing_list = true
    this.connection.transaction.header.add_end('X-Google-Loop', 'blah-blah whatcha')
    this.plugin.mailing_list(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /googlegroups/.test(r.pass))
      done()
    }, this.connection)
  })
})

describe('delivered_to', function () {
  it('disabled', function (done) {
    this.plugin.cfg.check.delivered_to = false
    this.plugin.delivered_to(function (res, msg) {
      assert.equal(undefined, res)
      assert.equal(undefined, msg)
      done()
    }, this.connection)
  })

  it('header not present', function (done) {
    this.plugin.cfg.check.delivered_to = true
    this.plugin.delivered_to(function (res, msg) {
      assert.equal(undefined, res)
      assert.equal(undefined, msg)
      done()
    }, this.connection)
  })

  it('no recipient match', function (done) {
    this.plugin.cfg.check.delivered_to = true
    // this.connection.transaction.mail_from = new Address('<test@example.com>');
    this.connection.transaction.header.add_end('Delivered-To', 'user@example.com')
    this.plugin.delivered_to(function (res, msg) {
      assert.equal(undefined, res)
      assert.equal(undefined, msg)
      done()
    }, this.connection)
  })

  it('recipient match', function (done) {
    this.plugin.cfg.check.delivered_to = true
    // this.connection.transaction.mail_from = new Address('<test@example.com>');
    this.connection.transaction.header.add_end('Delivered-To', 'user@example.com')
    this.connection.transaction.rcpt_to.push(new Address('user@example.com'))
    this.plugin.delivered_to(function (res, msg) {
      assert.equal(DENY, res)
      assert.equal('Invalid Delivered-To header content', msg)
      done()
    }, this.connection)
  })

  it('recipient match, reject disabled', function (done) {
    this.plugin.cfg.check.delivered_to = true
    this.plugin.cfg.reject.delivered_to = false
    // this.connection.transaction.mail_from = new Address('<test@example.com>');
    this.connection.transaction.header.add_end('Delivered-To', 'user@example.com')
    this.connection.transaction.rcpt_to.push(new Address('user@example.com'))
    this.plugin.delivered_to(function (res, msg) {
      assert.equal(undefined, res)
      assert.equal(undefined, msg)
      done()
    }, this.connection)
  })
})

describe('has_auth_match', function () {
  it('detects an absense of auth data', function (done) {
    assert.equal(this.plugin.has_auth_match('test.com', this.connection), false)
    done()
  })

  it('detects a passed SPF auth', function (done) {
    this.connection.transaction.results.add({ name: 'spf' }, { pass: 'test.com' })
    assert.equal(this.plugin.has_auth_match('test.com', this.connection), true)
    done()
  })

  it('detects a passed DKIM auth (notes)', function (done) {
    this.connection.transaction.notes.dkim_results = [{ result: 'pass', domain: 'test.com' }]
    assert.equal(this.plugin.has_auth_match('test.com', this.connection), true)
    done()
  })

  it('detects a passed DKIM auth (results)', function (done) {
    this.connection.transaction.results.add({ name: 'dkim' }, { pass: 'test.com' })
    assert.equal(this.plugin.has_auth_match('test.com', this.connection), true)
    done()
  })
})

describe('from_phish', function () {
  it('passes mfrom match', function (done) {
    this.connection.transaction.mail_from = new Address('<test@example.com>')
    this.connection.transaction.header.add_end('From', '"Test User" <test@example.com>')
    this.plugin.from_phish(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      // console.log(r)
      assert.equal(true, r.pass.includes('from_phish'))
      done()
    }, this.connection)
  })

  it('fails when amazon is in the From display name and not envelope sender', function (done) {
    this.connection.transaction.mail_from = new Address('<test@example.com>')
    this.connection.transaction.header.add_end('From', 'Amazon <test@ayodongbanyak08.com>')
    this.plugin.from_phish(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      // console.log(r)
      assert.equal(r.fail.length, 1)
      done()
    }, this.connection)
  })

  it('passes dkim match', function (done) {
    // this.plugin.cfg.check.from_phish=true;
    this.connection.transaction.mail_from = new Address(
      '<01010173e2d51ce9-fda858da-b513-412f-b03b-6db12012417e-000000@us-west-2.amazonses.com>',
    )
    this.connection.transaction.header.add_end('From', 'Amazon Business <no-reply@business.amazon.com>')
    this.connection.transaction.results.add({ name: 'dkim' }, { pass: ['business.amazon.com', 'amazonses.com'] })
    this.plugin.from_phish(() => {
      const r = this.connection.transaction.results.get('haraka-plugin-headers')
      assert.deepEqual(r.fail, [])
      assert.deepEqual(r.pass, ['from_phish'])
      done()
    }, this.connection)
  })

  const testCases = [
    {
      description: 'allows messages when no commonly abused names configured',
      from: 'Costco Support <spam@spammer.com>',
      expectedCode: undefined,
      setup: function (connection, plugin) {
        plugin.phish_targets = []
      },
    },
    {
      description: 'rejects when costco in header from but domain is not costco.com',
      from: 'Costco Support <spam@spammer.com>',
      expectedCode: constants.DENY,
      assertMsg: (msg) => {
        assert.ok(msg.includes('impersonate'))
      },
    },
    {
      description: 'rejects lookalike patterns like c0stc0 in header from',
      from: 'C0stc0 Support <spam@spammer.com>',
      expectedCode: constants.DENY,
      assertMsg: (msg) => {
        assert.ok(msg.includes('impersonate'))
      },
    },
    {
      description: 'allows when costco in header domain is costco.com',
      from: 'Costco Support <noreply@costco.com>',
      expectedCode: undefined,
    },
    {
      description: 'allows when costco in header domain is subdomain of costco.com',
      from: 'Costco Support <noreply@mail.costco.com>',
      expectedCode: undefined,
    },
    {
      description: 'allows messages without abused names',
      from: 'John Doe <john@example.com>',
      expectedCode: undefined,
    },
    {
      description: 'is case-insensitive when checking abused names',
      from: 'COSTCO Support <spam@spammer.com>',
      expectedCode: constants.DENY,
    },
    {
      description: 'rejects paypal abuse',
      from: 'PayPal Security <noreply@phishing.com>',
      expectedCode: constants.DENY,
      assertMsg: (msg) => {
        assert.ok(msg.includes('paypal.com'))
      },
    },
    {
      description: 'avoids false positives with substring matches',
      from: 'John Doe <purchase@example.com>',
      expectedCode: undefined,
      comment: '"purchase" contains "chase" but should not be flagged',
    },
    {
      description: 'avoids false positives with domain names',
      from: 'Support <support@tamazon.com>',
      expectedCode: undefined,
      comment: '"tamazon.com" contains "amazon" but should not be flagged in domain',
    },
    {
      description: 'handles complex email address formats',
      from: '"Costco Support Team" <spam@spammer.com>',
      expectedCode: constants.DENY,
      assertMsg: (msg) => {
        assert.ok(msg.includes('costco.com'))
      },
      comment: 'Test with quoted display name',
    },
  ]

  for (const testCase of testCases) {
    it(testCase.description, function (done) {
      if (!this.plugin.cfg) this.plugin.cfg = {}
      if (!this.plugin.cfg.reject) this.plugin.cfg.reject = {}
      this.plugin.cfg.reject.from_phish = true

      if (testCase.setup) testCase.setup(this.connection, this.plugin)

      this.connection.transaction.header.add('From', testCase.from)

      this.plugin.from_phish((code, msg) => {
        assert.equal(code, testCase.expectedCode)

        if (testCase.assertMsg) testCase.assertMsg(msg)

        done()
      }, this.connection)
    })
  }
})
