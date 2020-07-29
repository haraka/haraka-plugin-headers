[![Build Status][ci-img]][ci-url]
[![Windows Build Status][ci-win-img]][ci-win-url]
[![Code Climate][clim-img]][clim-url]

[![NPM][npm-img]][npm-url]

# haraka-plugin-headers

This plugin performs a variety of mail header inspections.

## INSTALL

```sh
cd /path/to/local/haraka
npm install haraka-plugin-headers
echo "haraka-plugin-headers" >> config/plugins
service haraka restart
```

### Configuration

If the default configuration is not sufficient, copy the config file from the distribution into your haraka config dir and then modify it:

```sh
cp node_modules/haraka-plugin-headers/config/headers.ini config/headers.ini
$EDITOR config/headers.ini
```

## RFC 5322 Section 3.6:

    All messages MUST have a 'Date' and 'From' header and a message may not contain more than one 'Date', 'From', 'Sender', 'Reply-To', 'To', 'Cc', 'Bcc', 'Message-Id', 'In-Reply-To', 'References' or 'Subject' header.

The next two tests encompass the RFC 5322 checks:

## duplicate\_singular

Assure that all the singular headers are present only once. The list of
headers can be adjusted in config/data.headers.ini:

    * singular=Date,From,Sender,Reply-To,To,Cc,Bcc,Message-Id,In-Reply-To,References,Subject

## missing\_required

Assuring that all the required headers are present. The list of required
headers can be altered in config/data.headers.ini:

    required=From,Date

## invalid\_return\_path

Messages arriving via the internet should not have a Return-Path header set.
This checks for that header (unless connection.relaying is set).

## invalid\_date

Checks the date header and makes sure it's somewhat sane. By default, the date
cannot be more than 2 days in the future nor 15 days in the past. These can be
adjusted in config/data.headers.ini:

    date_future_days=2
    date_past_days=15

## user\_agent

Attempt to determine the User-Agent that generated the email. A UA is
determinable on about 70% of hammy messages.

## direct\_to\_mx

Counts the received headers. If there aren't at least two, then the MUA is
attempting direct delivery to us instead of via their outbound SMTP server.
This is typical of spam, our own users sending outbound email (which bypasses
this test), and machine generated messages like Facebook/Twitter
notifications.

## from\_match

See if the header From domain matches the envelope FROM domain. There are many
legit reasons to not match, but matching domains are far more frequent in ham.

## mailing\_list

Attempt to determine if this message was sent via an email list. This is very
rudimentary at present and only detects the most common email lists.

Forwarders, of which email lists are a special type, constitutes the majority
of the minority (~10%) of ham which fails SPF and DKIM tests. This MLM
detector is a building block in the ability to detect mail from forwarders
and assess their reputability.

## from\_phish

A common form of phishing is spamming the From display name with the domain name of the popular entity whose accounts they're phishing for.

# Configuration

The headers.ini file can contain [check] and [reject] sections.

## [check]

To turn on User Agent detection and turn off Mailing List detection:
Each key is the test/check name and a boolean value that enables or disables the check.

```ini
[check]
duplicate_singular=true
missing_required=true
invalid_return_path=true
invalid_date=true
user_agent=true
direct_to_mx=true
from_match=true
mailing_list=true
```

## [reject]

Turning off reject for a check lets it be enabled (for data collection)
without interrupting mail flow. To prevent a missing header from causing
messages to be rejected:

```ini
[reject]
missing_required=false
```


<!-- leave these buried at the bottom of the document -->
[ci-img]: https://github.com/haraka/haraka-plugin-headers/workflows/Plugin%20Tests/badge.svg
[ci-url]: https://github.com/haraka/haraka-plugin-headers/actions?query=workflow%3A%22Plugin+Tests%22
[ci-win-img]: https://github.com/haraka/haraka-plugin-headers/workflows/Plugin%20Tests%20-%20Windows/badge.svg
[ci-win-url]: https://github.com/haraka/haraka-plugin-headers/actions?query=workflow%3A%22Plugin+Tests+-+Windows%22
[clim-img]: https://codeclimate.com/github/haraka/haraka-plugin-headers/badges/gpa.svg
[clim-url]: https://codeclimate.com/github/haraka/haraka-plugin-headers
[npm-img]: https://nodei.co/npm/haraka-plugin-headers.png
[npm-url]: https://www.npmjs.com/package/haraka-plugin-headers
