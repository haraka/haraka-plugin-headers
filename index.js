// validate message headers and some fields
const tlds = require('haraka-tld')

exports.register = function () {
  this.load_headers_ini()

  try {
    this.addrparser = require('address-rfc2822')
  } catch (ignore) {
    this.logerror("unable to load address-rfc2822, try\n\n\t'npm install -g address-rfc2822'\n\n")
  }

  if (this.cfg.check.duplicate_singular) this.register_hook('data_post', 'duplicate_singular')
  if (this.cfg.check.missing_required) this.register_hook('data_post', 'missing_required')
  if (this.cfg.check.invalid_return_path) this.register_hook('data_post', 'invalid_return_path')
  if (this.cfg.check.invalid_date) this.register_hook('data_post', 'invalid_date')
  if (this.cfg.check.user_agent) this.register_hook('data_post', 'user_agent')
  if (this.cfg.check.direct_to_mx) this.register_hook('data_post', 'direct_to_mx')

  if (this.addrparser) {
    if (this.cfg.check.from_match) this.register_hook('data_post', 'from_match')
    if (this.cfg.check.delivered_to) this.register_hook('data_post', 'delivered_to')
  }
  if (this.cfg.check.mailing_list) this.register_hook('data_post', 'mailing_list')
  if (this.cfg.check.from_phish) this.register_hook('data_post', 'from_phish')
}

exports.load_headers_ini = function () {
  const plugin = this
  plugin.cfg = plugin.config.get(
    'headers.ini',
    {
      booleans: [
        '+check.duplicate_singular',
        '+check.missing_required',
        '+check.invalid_return_path',
        '+check.invalid_date',
        '+check.user_agent',
        '+check.direct_to_mx',
        '+check.from_match',
        '+check.delivered_to',
        '+check.mailing_list',
        '+check.from_phish',

        '-reject.duplicate_singular',
        '-reject.missing_required',
        '-reject.invalid_return_path',
        '-reject.invalid_date',
        '+reject.delivered_to',
        '-reject.from_phish',
      ],
    },
    () => {
      plugin.load_headers_ini()
    },
  )

  this.phish_targets = []

  if (plugin.cfg.phish_domains !== undefined) {
    this.logerror('deprecated setting, update headers.ini per the README')

    for (const domain in plugin.cfg.phish_domains) {
      const brand = domain.split('.').slice(0, -1).join('.')
      this.phish_targets.push({
        brand,
        domain,
        pattern: new RegExp(domain.replace('.', '[.]'), 'i'),
      })
    }
  }

  for (const [brand, domain] of Object.entries(plugin.cfg.phish_targets)) {
    // Use word boundaries to avoid false positives
    const escaped_name = brand.toLowerCase().replace(/[.*+?^${}()|[\\\]]/g, '\\$&')
    this.phish_targets.push({
      brand: brand.toLowerCase(),
      pattern: new RegExp(`\\b${escaped_name}\\b`, 'i'),
      domain,
    })
  }
}

exports.duplicate_singular = function (next, connection) {
  const plugin = this

  // RFC 5322 Section 3.6, Headers that MUST be unique if present
  const singular =
    plugin.cfg.main.singular !== undefined
      ? plugin.cfg.main.singular.split(',')
      : ['Date', 'From', 'Sender', 'Reply-To', 'To', 'Cc', 'Bcc', 'Message-Id', 'In-Reply-To', 'References', 'Subject']

  const failures = []
  for (const name of singular) {
    if (connection.transaction.header.get_all(name).length <= 1) {
      continue
    }

    connection.transaction.results.add(plugin, { fail: `duplicate:${name}` })
    failures.push(name)
  }

  if (failures.length) {
    if (plugin.cfg.reject.duplicate_singular) {
      return next(DENY, `Only one ${failures[0]} header allowed. See RFC 5322, Section 3.6`)
    }
    return next()
  }

  connection.transaction.results.add(plugin, { pass: 'duplicate' })
  next()
}

exports.missing_required = function (next, connection) {
  const plugin = this

  // Enforce RFC 5322 Section 3.6, Headers that MUST be present
  const required = plugin.cfg.main.required !== undefined ? plugin.cfg.main.required.split(',') : ['Date', 'From']

  const failures = []
  for (const h of required) {
    if (connection.transaction.header.get_all(h).length === 0) {
      connection.transaction.results.add(plugin, { fail: `missing:${h}` })
      failures.push(h)
    }
  }

  if (failures.length) {
    if (plugin.cfg.reject.missing_required) {
      return next(DENY, `Required header '${failures[0]}' missing`)
    }
    return next()
  }

  connection.transaction.results.add(plugin, { pass: 'missing' })
  next()
}

exports.invalid_return_path = function (next, connection) {
  const plugin = this

  // Tests for Return-Path headers that shouldn't be present

  // RFC 5321#section-4.4 Trace Information
  //   A message-originating SMTP system SHOULD NOT send a message that
  //   already contains a Return-path header field.

  // Return-Path, aka Reverse-PATH, Envelope FROM, RFC5321.MailFrom
  const rp = connection.transaction.header.get('Return-Path')
  if (rp) {
    if (connection.relaying) {
      // On messages we originate
      connection.transaction.results.add(plugin, {
        fail: 'Return-Path',
        emit: true,
      })
      if (plugin.cfg.reject.invalid_return_path) {
        return next(DENY, 'outgoing mail must not have a Return-Path header (RFC 5321)')
      }
      return next()
    }

    // generally, messages from the internet shouldn't have a
    // Return-Path, except for when they can. Read RFC 5321, it's
    // complicated. In most cases, The Right Thing to do here is to
    // strip the Return-Path header.
    connection.transaction.remove_header('Return-Path')
    // unless it was added by Haraka. Which at present, doesn't.
  }

  connection.transaction.results.add(plugin, { pass: 'Return-Path' })
  next()
}

exports.invalid_date = function (next, connection) {
  const plugin = this

  // Assure Date header value is [somewhat] sane
  let msg_date = connection.transaction.header.get_all('Date')
  if (!msg_date || msg_date.length === 0) return next()

  connection.logdebug(plugin, `message date: ${msg_date}`)
  msg_date = Date.parse(msg_date)

  const date_future_days = plugin.cfg.main.date_future_days !== undefined ? plugin.cfg.main.date_future_days : 2

  if (date_future_days > 0) {
    const too_future = new Date()
    too_future.setHours(too_future.getHours() + 24 * date_future_days)
    // connection.logdebug(plugin, "too future: " + too_future);
    if (msg_date > too_future) {
      connection.transaction.results.add(plugin, {
        fail: 'invalid_date(future)',
      })
      if (plugin.cfg.reject.invalid_date) {
        return next(DENY, 'The Date header is too far in the future')
      }
      return next()
    }
  }

  const date_past_days = plugin.cfg.main.date_past_days !== undefined ? plugin.cfg.main.date_past_days : 15

  if (date_past_days > 0) {
    const too_old = new Date()
    too_old.setHours(too_old.getHours() - 24 * date_past_days)
    // connection.logdebug(plugin, "too old: " + too_old);
    if (msg_date < too_old) {
      connection.loginfo(plugin, `date is older than: ${too_old}`)
      connection.transaction.results.add(plugin, { fail: 'invalid_date(past)' })
      if (plugin.cfg.reject.invalid_date) {
        return next(DENY, 'The Date header is too old')
      }
      return next()
    }
  }

  connection.transaction.results.add(plugin, { pass: 'invalid_date' })
  next()
}

exports.user_agent = function (next, connection) {
  const plugin = this

  if (!connection.transaction) return next()

  let found_ua = 0

  // User-Agent: Thunderbird, Squirrelmail, Roundcube, Mutt, MacOutlook,
  //             Kmail, IMP
  // X-Mailer: Apple Mail, swaks, Outlook (12-14), Yahoo Webmail,
  //           Cold Fusion, Zimbra, Evolution
  // X-Yahoo-Newman-Property: Yahoo
  // X-MS-Has-Attach: Outlook 15

  // Check for User-Agent
  const headers = ['user-agent', 'x-mailer', 'x-mua', 'x-yahoo-newman-property', 'x-ms-has-attach']
  // for (const h in headers) {}
  for (const name of headers) {
    const header = connection.transaction.header.get(name)
    if (!header) continue // header not present
    found_ua++
    connection.transaction.results.add(plugin, {
      pass: `UA(${header.substring(0, 12)})`,
    })
  }
  if (found_ua) return next()

  connection.transaction.results.add(plugin, { fail: 'UA' })
  next()
}

exports.direct_to_mx = function (next, connection) {
  const plugin = this

  if (!connection.transaction) return next()

  // Legit messages normally have at least 2 hops (Received headers)
  //     MUA -> sending MTA -> Receiving MTA (Haraka?)
  if (connection.notes.auth_user) {
    // User authenticated, so we're likely the first MTA
    connection.transaction.results.add(plugin, { skip: 'direct-to-mx(auth)' })
    return next()
  }

  // what about connection.relaying?

  const received = connection.transaction.header.get_all('received')
  if (!received) {
    connection.transaction.results.add(plugin, { fail: 'direct-to-mx(none)' })
    return next()
  }

  const c = received.length
  if (c < 2) {
    connection.transaction.results.add(plugin, {
      fail: `direct-to-mx(too few Received(${c}))`,
    })
    return next()
  }

  connection.transaction.results.add(plugin, { pass: `direct-to-mx(${c})` })
  next()
}

exports.from_match = function (next, connection) {
  const plugin = this

  // see if the header From matches the envelope FROM. There are valid
  // cases to not match (~10% of ham) but a non-match is much more
  // likely to be spam than ham. This test is useful for heuristics.
  if (!connection.transaction) return next()

  const env_addr = connection.transaction.mail_from
  if (!env_addr) {
    connection.transaction.results.add(plugin, { fail: 'from_match(null)' })
    return next()
  }

  const hdr_from = connection.transaction.header.get_decoded('From')
  if (!hdr_from) {
    connection.transaction.results.add(plugin, { fail: 'from_match(missing)' })
    return next()
  }

  let hdr_addr
  try {
    hdr_addr = plugin.addrparser.parse(hdr_from)[0]
  } catch (e) {
    connection.logwarn(plugin, `parsing "${hdr_from.trim()}" with address-rfc2822 plugin returned error: ${e.message}`)
    connection.transaction.results.add(plugin, {
      fail: 'from_match(rfc_violation)',
    })
    return next()
  }

  if (!hdr_addr) {
    connection.loginfo(plugin, `address at fault is: ${hdr_from}`)
    connection.transaction.results.add(plugin, {
      fail: 'from_match(unparsable)',
    })
    return next()
  }

  if (env_addr.address().toLowerCase() === hdr_addr.address.toLowerCase()) {
    connection.transaction.results.add(plugin, { pass: 'from_match' })
    return next()
  }

  const extra = ['domain']
  const env_dom = tlds.get_organizational_domain(env_addr.host)
  const msg_dom = tlds.get_organizational_domain(hdr_addr.host())
  if (env_dom && msg_dom && env_dom.toLowerCase() === msg_dom.toLowerCase()) {
    const fcrdns = connection.results.get('fcrdns')
    if (fcrdns && fcrdns.fcrdns && new RegExp(`${msg_dom}\\b`, 'i').test(fcrdns.fcrdns)) {
      extra.push('fcrdns')
    }
    const helo = connection.results.get('helo.checks')
    if (helo && helo.helo_host && /msg_dom$/.test(helo.helo_host)) {
      extra.push('helo')
    }

    connection.transaction.results.add(plugin, {
      pass: `from_match(${extra.join(',')})`,
    })
    return next()
  }

  connection.transaction.results.add(plugin, {
    emit: true,
    fail: `from_match(${env_dom} / ${msg_dom})`,
  })
  next()
}

exports.delivered_to = function (next, connection) {
  const plugin = this

  const txn = connection.transaction
  if (!txn) return next()
  const del_to = txn.header.get('Delivered-To')
  if (!del_to) return next()

  const rcpts = connection.transaction.rcpt_to
  for (const rcptElement of rcpts) {
    const rcpt = rcptElement.address()
    if (rcpt !== del_to) continue
    connection.transaction.results.add(plugin, {
      emit: true,
      fail: 'delivered_to',
    })
    if (!plugin.cfg.reject.delivered_to) continue
    return next(DENY, 'Invalid Delivered-To header content')
  }

  next()
}

exports.mailing_list = function (next, connection) {
  const plugin = this
  if (!connection.transaction) return next()

  const mlms = {
    'Mailing-List': [
      { mlm: 'ezmlm', match: 'ezmlm' },
      { mlm: 'yahoogroups', match: 'yahoogroups' },
      { mlm: 'googlegroups', match: 'googlegroups' },
    ],
    Sender: [{ mlm: 'majordomo', start: 'owner-' }],
    'X-Mailman-Version': [{ mlm: 'mailman' }],
    'X-Majordomo-Version': [{ mlm: 'majordomo' }],
    'X-Google-Loop': [{ mlm: 'googlegroups' }],
  }

  let found_mlm = 0
  const txr = connection.transaction.results

  Object.keys(mlms).forEach((name) => {
    const header = connection.transaction.header.get(name)
    if (!header) {
      return
    } // header not present
    for (const j of mlms[name]) {
      if (j.start) {
        if (header.substring(0, j.start.length) === j.start) {
          txr.add(plugin, { pass: `MLM(${j.mlm})` })
          found_mlm++
          continue
        }
        connection.logdebug(plugin, `mlm start miss: ${name}: ${header}`)
      }
      if (j.match) {
        if (header.match(new RegExp(j.match, 'i'))) {
          txr.add(plugin, { pass: `MLM(${j.mlm})` })
          found_mlm++
          continue
        }
        connection.logdebug(plugin, `mlm match miss: ${name}: ${header}`)
      }
      if (name === 'X-Mailman-Version') {
        txr.add(plugin, { pass: `MLM(${j.mlm})` })
        found_mlm++
        continue
      }
      if (name === 'X-Majordomo-Version') {
        txr.add(plugin, { pass: `MLM(${j.mlm})` })
        found_mlm++
        continue
      }
      if (name === 'X-Google-Loop') {
        txr.add(plugin, { pass: `MLM(${j.mlm})` })
        found_mlm++
        continue
      }
    }
  })
  if (found_mlm) return next()

  connection.transaction.results.add(plugin, { msg: 'not MLM' })
  next()
}

exports.from_phish = function (next, connection) {
  if (!connection.transaction) return next()

  try {
    const hdr_from = connection.transaction.header.get_decoded('from')

    if (!hdr_from) {
      connection.transaction.results.add(this, { skip: 'from_phish(missing)' })
      return next()
    }

    // extract the from domain by parsing the From header, grabbing the first address, extracting the
    // portion following the last @, and reducing that to an Org Domain
    const hdr_from_domain = tlds.get_organizational_domain(this.addrparser.parse(hdr_from)[0].address.split('@').at(-1))

    for (const pt of this.phish_targets) {
      if (pt.pattern.test(this.normalize_lookalikes(hdr_from))) {
        if (exports.has_auth_match(pt.domain, connection)) continue

        if (hdr_from_domain !== pt.domain) {
          connection.transaction.results.add(this, {
            fail: `from_phish(${pt.brand})`,
            msg: `'${pt.brand}' found when domain is '${hdr_from_domain}' instead of '${pt.domain}'`,
          })

          if (this.cfg.reject.from_phish) {
            return next(DENY, `Phishing message appears to impersonate ${pt.domain}`)
          }
          return next()
        }
      }
    }

    connection.transaction.results.add(this, { pass: 'from_phish' })
    next()
  } catch (err) {
    connection.transaction.results.add(this, { err: `from_phish: ${err}` })
    next()
  }
}

exports.has_auth_match = function (domain, conn) {
  // check domain RegEx against spf, dkim, and fcrdns for a match
  const re = new RegExp(domain.replace('.', '[.]'), 'i')

  const spf = conn.transaction.results.get('spf') // only check mfrom
  if (spf && re.test(spf.pass)) return true

  // try DKIM via results
  const dkim = conn.transaction.results.get('dkim')
  if (dkim && re.test(dkim.pass)) return true

  // fallback DKIM via notes
  const dkim_note = conn.transaction.notes.dkim_results
  if (dkim_note) {
    const passes = dkim_note.filter((r) => r.result === 'pass' && re.test(r.domain))
    if (passes.length) return true
  }

  if (this.has_fcrdns_match(domain, conn)) return true

  return false
}

exports.normalize_lookalikes = function (text) {
  return text
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/\)/g, 'g')
    .replace(/\|/g, 'l')
    .replace(/\$/g, 's')
}

exports.has_fcrdns_match = function (sender_od, connection) {
  const fcrdns = connection.results.get('fcrdns')
  if (!fcrdns) return false
  if (!fcrdns.fcrdns) return false

  let mail_host = fcrdns.fcrdns
  if (Array.isArray(mail_host)) mail_host = fcrdns.fcrdns[0]

  const fcrdns_od = tlds.get_organizational_domain(mail_host)
  if (fcrdns_od !== sender_od) return false

  return true
}
