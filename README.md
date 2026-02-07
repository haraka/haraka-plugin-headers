[![CI Tests][ci-img]][ci-url]
[![Code Climate][clim-img]][clim-url]

# haraka-plugin-headers

This plugin performs a variety of mail header inspections.

## INSTALL

```sh
cd /path/to/local/haraka
npm install haraka-plugin-headers
echo "headers" >> config/plugins
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

## duplicate_singular

Assure that all the singular headers are present only once. The list of
headers can be adjusted in config/headers.ini:

    * singular=Date,From,Sender,Reply-To,To,Cc,Bcc,Message-Id,In-Reply-To,References,Subject

## missing_required

Assuring that all the required headers are present. The list of required
headers can be altered in config/headers.ini:

    required=From,Date

## invalid_return_path

Messages arriving via the internet should not have a Return-Path header set.
This checks for that header (unless connection.relaying is set).

## invalid_date

Checks the date header and makes sure it's somewhat sane. By default, the date
cannot be more than 2 days in the future nor 15 days in the past. These can be
adjusted in config/headers.ini:

```ini
date_future_days=2
date_past_days=15
```

## user_agent

Attempt to determine the User-Agent that generated the email. A UA is
determinable on about 70% of hammy messages.

## direct_to_mx

Counts the received headers. If there aren't at least two, then the MUA is
attempting direct delivery to us instead of via their outbound SMTP server.
This is typical of spam, our own users sending outbound email (which bypasses
this test), and machine generated messages like Facebook/Twitter
notifications.

## from_match

See if the header From domain matches the envelope FROM domain. There are many
legit reasons to not match, but matching domains are far more frequent in ham.

## mailing_list

Attempt to determine if this message was sent via an email list. This is very
rudimentary at present and only detects the most common email lists.

Forwarders, of which email lists are a special type, constitutes the majority
of the minority (~10%) of ham which fails SPF and DKIM tests. This MLM
detector is a building block in the ability to detect mail from forwarders
and assess their reputability.

## from_phish

A common form of phishing is spamming the From display name with a well-known brand name. This tests the brands listed in the [phish_targets] configuration section and requires that brands appearing in the From header must match from brands domain name.

```ini
[phish_targets]
costco=costco.com
paypa1=paypal.com
```

In the example shown, if the word Costco (or common lookalikes such as c0stc0) appear in the From display name, then the From domain must originate from costco.com.

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

[ci-img]: https://github.com/haraka/haraka-plugin-headers/actions/workflows/ci.yml/badge.svg
[ci-url]: https://github.com/haraka/haraka-plugin-headers/actions/workflows/ci.yml
[clim-img]: https://codeclimate.com/github/haraka/haraka-plugin-headers/badges/gpa.svg
[clim-url]: https://codeclimate.com/github/haraka/haraka-plugin-headers
