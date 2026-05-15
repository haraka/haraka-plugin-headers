// node.js built-in modules
const assert = require('node:assert')
const { describe, it, beforeEach } = require('node:test')

// npm modules
const Address = require('@haraka/email-address').Address
const constants = require('haraka-constants')
const fixtures = require('haraka-test-fixtures')

// start of tests
//    assert: https://nodejs.org/api/assert.html
//    node:test: https://nodejs.org/api/test.html

let plugin, connection

beforeEach(() => {
  plugin = new fixtures.plugin('haraka-plugin-headers')
  plugin.register()

  try {
    plugin.addrparser = require('@haraka/email-address')
  } catch (ignore) {}

  connection = fixtures.connection.createConnection()
  connection.init_transaction()
})

describe('haraka-plugin-headers', () => {
  it('loads', () => {
    assert.ok(plugin)
  })
})

describe('load_headers_ini', () => {
  it('loads headers.ini from config/headers.ini', () => {
    plugin.load_headers_ini()
    // console.log(plugin.cfg);
    assert.ok(plugin.cfg)
  })

  it('initializes enabled boolean', () => {
    plugin.load_headers_ini()
    assert.equal(plugin.cfg.check.duplicate_singular, true)
  })
})

describe('user_agent', () => {
  it('none', (t, done) => {
    plugin.cfg.check.user_agent = true
    plugin.user_agent(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(/UA/.test(r.fail), true)
      assert.equal(/UA/.test(r.pass), false)
      done()
    }, connection)
  })

  it('thunderbird', (t, done) => {
    plugin.cfg.check.user_agent = true
    connection.transaction.header.add_end('User-Agent', 'Thunderbird')
    plugin.user_agent(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      // console.log(r)
      assert.equal(true, /UA/.test(r.pass))
      assert.equal(false, /UA/.test(r.fail))
      done()
    }, connection)
  })

  it('X-mailer', (t, done) => {
    plugin.cfg.check.user_agent = true
    connection.transaction.header.add_end('X-Mailer', 'Apple Mail')
    plugin.user_agent(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /UA/.test(r.pass))
      assert.equal(false, /UA/.test(r.fail))
      done()
    }, connection)
  })
})

describe('direct_to_mx', () => {
  it('auth user', (t, done) => {
    connection.notes.auth_user = 'test@example.com'
    plugin.cfg.check.direct_to_mx = true
    plugin.direct_to_mx(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /^direct-to-mx/.test(r.skip))
      assert.equal(false, /^direct-to-mx/.test(r.pass))
      assert.equal(false, /^direct-to-mx/.test(r.fail))
      done()
    }, connection)
  })

  it('received 0', (t, done) => {
    plugin.cfg.check.direct_to_mx = true
    plugin.direct_to_mx(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /^direct-to-mx/.test(r.fail))
      assert.equal(false, /^direct-to-mx/.test(r.pass))
      assert.equal(false, /^direct-to-mx/.test(r.skip))
      done()
    }, connection)
  })
  it('received 1', (t, done) => {
    plugin.cfg.check.direct_to_mx = true
    connection.transaction.header.add_end('Received', 'blah')
    plugin.direct_to_mx(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /^direct-to-mx/.test(r.fail))
      done()
    }, connection)
  })
  it('received 2', (t, done) => {
    plugin.cfg.check.direct_to_mx = true
    connection.transaction.header.add_end('Received', 'blah1')
    connection.transaction.header.add_end('Received', 'blah2')
    plugin.direct_to_mx(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /^direct-to-mx/.test(r.pass))
      assert.equal(false, /^direct-to-mx/.test(r.fail))
      assert.equal(false, /^direct-to-mx/.test(r.skip))
      done()
    }, connection)
  })
})

describe('from_match', () => {
  it('match bare', (t, done) => {
    plugin.cfg.check.from_match = true
    connection.transaction.mail_from = new Address('<test@example.com>')
    connection.transaction.header.add_end('From', 'test@example.com')
    plugin.from_match(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.notEqual(-1, r.pass.indexOf('from_match'))
      done()
    }, connection)
  })
  it('match typical', (t, done) => {
    plugin.cfg.check.from_match = true
    connection.transaction.mail_from = new Address('<test@example.com>')
    connection.transaction.header.add_end('From', '"Test User" <test@example.com>')
    plugin.from_match(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.notEqual(-1, r.pass.indexOf('from_match'))
      done()
    }, connection)
  })
  it('match unquoted', (t, done) => {
    plugin.cfg.check.from_match = true
    connection.transaction.mail_from = new Address('<test@example.com>')
    connection.transaction.header.add_end('From', 'Test User <test@example.com>')
    plugin.from_match(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.notEqual(-1, r.pass.indexOf('from_match'))
      done()
    }, connection)
  })

  it('mismatch', (t, done) => {
    plugin.cfg.check.from_match = true
    connection.transaction.mail_from = new Address('<test@example.com>')
    connection.transaction.header.add_end('From', 'test@example.net')
    // console.log(this.connection.transaction.results);
    plugin.from_match(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /^from_match/.test(r.fail))
      done()
    }, connection)
  })
})

describe('mailing_list', () => {
  it('ezmlm true', (t, done) => {
    plugin.cfg.check.mailing_list = true
    connection.transaction.header.add_end('Mailing-List', 'blah blah: run by ezmlm')
    plugin.mailing_list(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /ezmlm/.test(r.pass))
      assert.equal(0, r.fail.length)
      done()
    }, connection)
  })
  it('ezmlm false', (t, done) => {
    plugin.cfg.check.mailing_list = true
    connection.transaction.header.add_end('Mailing-List', 'blah blah random header tokens')
    plugin.mailing_list(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(r.pass.length, 0)
      assert.equal(true, /not/.test(r.msg))
      done()
    }, connection)
  })
  it('yahoogroups', (t, done) => {
    plugin.cfg.check.mailing_list = true
    connection.transaction.header.add_end('Mailing-List', 'blah blah such-and-such@yahoogroups.com email list')
    plugin.mailing_list(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /yahoogroups/.test(r.pass))
      done()
    }, connection)
  })
  it('majordomo', (t, done) => {
    plugin.cfg.check.mailing_list = true
    connection.transaction.header.add_end('Sender', 'owner-blah-blah whatcha')
    plugin.mailing_list(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /majordomo/.test(r.pass))
      done()
    }, connection)
  })
  it('mailman', (t, done) => {
    connection.transaction.header.add_end('X-Mailman-Version', 'owner-blah-blah whatcha')
    plugin.cfg.check.mailing_list = true
    plugin.mailing_list(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /mailman/.test(r.pass))
      done()
    }, connection)
  })
  it('majordomo v', (t, done) => {
    plugin.cfg.check.mailing_list = true
    connection.transaction.header.add_end('X-Majordomo-Version', 'owner-blah-blah whatcha')
    plugin.mailing_list(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /majordomo/.test(r.pass))
      done()
    }, connection)
  })
  it('google groups', (t, done) => {
    plugin.cfg.check.mailing_list = true
    connection.transaction.header.add_end('X-Google-Loop', 'blah-blah whatcha')
    plugin.mailing_list(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.equal(true, /googlegroups/.test(r.pass))
      done()
    }, connection)
  })
})

describe('delivered_to', () => {
  it('disabled', (t, done) => {
    plugin.cfg.check.delivered_to = false
    plugin.delivered_to(function (res, msg) {
      assert.equal(undefined, res)
      assert.equal(undefined, msg)
      done()
    }, connection)
  })

  it('header not present', (t, done) => {
    plugin.cfg.check.delivered_to = true
    plugin.delivered_to(function (res, msg) {
      assert.equal(undefined, res)
      assert.equal(undefined, msg)
      done()
    }, connection)
  })

  it('no recipient match', (t, done) => {
    plugin.cfg.check.delivered_to = true
    // this.connection.transaction.mail_from = new Address('<test@example.com>');
    connection.transaction.header.add_end('Delivered-To', 'user@example.com')
    plugin.delivered_to(function (res, msg) {
      assert.equal(undefined, res)
      assert.equal(undefined, msg)
      done()
    }, connection)
  })

  it('recipient match', (t, done) => {
    plugin.cfg.check.delivered_to = true
    // this.connection.transaction.mail_from = new Address('<test@example.com>');
    connection.transaction.header.add_end('Delivered-To', 'user@example.com')
    connection.transaction.rcpt_to.push(new Address('user@example.com'))
    plugin.delivered_to(function (res, msg) {
      assert.equal(DENY, res)
      assert.equal('Invalid Delivered-To header content', msg)
      done()
    }, connection)
  })

  it('recipient match, reject disabled', (t, done) => {
    plugin.cfg.check.delivered_to = true
    plugin.cfg.reject.delivered_to = false
    // this.connection.transaction.mail_from = new Address('<test@example.com>');
    connection.transaction.header.add_end('Delivered-To', 'user@example.com')
    connection.transaction.rcpt_to.push(new Address('user@example.com'))
    plugin.delivered_to(function (res, msg) {
      assert.equal(undefined, res)
      assert.equal(undefined, msg)
      done()
    }, connection)
  })
})

describe('has_auth_match', () => {
  it('detects an absense of auth data', (t, done) => {
    assert.equal(plugin.has_auth_match('test.com', connection), false)
    done()
  })

  it('detects a passed SPF auth', (t, done) => {
    connection.transaction.results.add({ name: 'spf' }, { pass: 'test.com' })
    assert.equal(plugin.has_auth_match('test.com', connection), true)
    done()
  })

  it('detects a passed DKIM auth (notes)', (t, done) => {
    connection.transaction.notes.dkim_results = [{ result: 'pass', domain: 'test.com' }]
    assert.equal(plugin.has_auth_match('test.com', connection), true)
    done()
  })

  it('detects a passed DKIM auth (results)', (t, done) => {
    connection.transaction.results.add({ name: 'dkim' }, { pass: 'test.com' })
    assert.equal(plugin.has_auth_match('test.com', connection), true)
    done()
  })
})

describe('from_phish', () => {
  it('passes mfrom match', (t, done) => {
    connection.transaction.mail_from = new Address('<test@example.com>')
    connection.transaction.header.add_end('From', '"Test User" <test@example.com>')
    plugin.from_phish(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      // console.log(r)
      assert.equal(true, r.pass.includes('from_phish'))
      done()
    }, connection)
  })

  it('fails when amazon is in the From display name and not envelope sender', (t, done) => {
    connection.transaction.mail_from = new Address('<test@example.com>')
    connection.transaction.header.add_end('From', 'Amazon <test@ayodongbanyak08.com>')
    plugin.from_phish(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      // console.log(r)
      assert.equal(r.fail.length, 1)
      done()
    }, connection)
  })

  it('passes dkim match', (t, done) => {
    // this.plugin.cfg.check.from_phish=true;
    connection.transaction.mail_from = new Address(
      '<01010173e2d51ce9-fda858da-b513-412f-b03b-6db12012417e-000000@us-west-2.amazonses.com>',
    )
    connection.transaction.header.add_end('From', 'Amazon Business <no-reply@business.amazon.com>')
    connection.transaction.results.add({ name: 'dkim' }, { pass: ['business.amazon.com', 'amazonses.com'] })
    plugin.from_phish(() => {
      const r = connection.transaction.results.get('haraka-plugin-headers')
      assert.deepEqual(r.fail, [])
      assert.deepEqual(r.pass, ['from_phish'])
      done()
    }, connection)
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
    it(testCase.description, (t, done) => {
      if (!plugin.cfg) plugin.cfg = {}
      if (!plugin.cfg.reject) plugin.cfg.reject = {}
      plugin.cfg.reject.from_phish = true

      if (testCase.setup) testCase.setup(connection, plugin)

      connection.transaction.header.add('From', testCase.from)

      plugin.from_phish((code, msg) => {
        assert.equal(code, testCase.expectedCode)

        if (testCase.assertMsg) testCase.assertMsg(msg)

        done()
      }, connection)
    })
  }
})
