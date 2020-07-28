[![Build Status][ci-img]][ci-url]
[![Code Climate][clim-img]][clim-url]
[![NPM][npm-img]][npm-url]

# haraka-plugin-haraka-plugin-headers

Clone me, to create a new plugin!

# Template Instructions

These instructions will not self-destruct after use. Use and destroy.

See also, [How to Write a Plugin](https://github.com/haraka/Haraka/wiki/Write-a-Plugin) and [Plugins.md](https://github.com/haraka/Haraka/blob/master/docs/Plugins.md) for additional plugin writing information.

## Create a new repo for your plugin

Haraka plugins are named like `haraka-plugin-something`. All the namespace after `haraka-plugin-` is yours for the taking. Please check the [Plugins]() page and a Google search to see what plugins already exist.

Once you've settled on a name, create the GitHub repo. On the repo's main page, click the _Clone or download_ button and copy the URL. Then paste that URL into a local ENV variable with a command like this:

```sh
export MY_GITHUB_ORG=haraka
export MY_PLUGIN_NAME=haraka-plugin-SOMETHING
```

Clone and rename the haraka-plugin-headers repo:

```sh
git clone git@github.com:haraka/haraka-plugin-haraka-plugin-headers.git
mv haraka-plugin-haraka-plugin-headers $MY_PLUGIN_NAME
cd $MY_PLUGIN_NAME
git remote rm origin
git remote add origin "git@github.com:$MY_GITHUB_ORG/$MY_PLUGIN_NAME.git"
```

Now you'll have a local git repo to begin authoring your plugin

## rename boilerplate

Replaces all uses of the word `haraka-plugin-headers` with your plugin's name.

./redress.sh [something]

You'll then be prompted to update package.json and then force push this repo onto the GitHub repo you've created earlier.


## Enable Travis-CI testing

- [ ] visit your [Travis-CI profile page](https://travis-ci.org/profile) and enable Continuous Integration testing on the repo
- [ ] enable Code Climate. Click the _code climate_ badge and import your repo.



# Add your content here

## INSTALL

```sh
cd /path/to/local/haraka
npm install haraka-plugin-haraka-plugin-headers
echo "haraka-plugin-headers" >> config/plugins
service haraka restart
```

### Configuration

If the default configuration is not sufficient, copy the config file from the distribution into your haraka config dir and then modify it:

```sh
cp node_modules/haraka-plugin-haraka-plugin-headers/config/haraka-plugin-headers.ini config/haraka-plugin-headers.ini
$EDITOR config/haraka-plugin-headers.ini
```

## USAGE


<!-- leave these buried at the bottom of the document -->
[ci-img]: https://travis-ci.org/haraka/haraka-plugin-haraka-plugin-headers.svg
[ci-url]: https://travis-ci.org/haraka/haraka-plugin-haraka-plugin-headers
[ci-win-img]: https://ci.appveyor.com/api/projects/status/CHANGETHIS?svg=true
[ci-win-url]: https://ci.appveyor.com/project/haraka/haraka-CHANGETHIS
[clim-img]: https://codeclimate.com/github/haraka/haraka-plugin-haraka-plugin-headers/badges/gpa.svg
[clim-url]: https://codeclimate.com/github/haraka/haraka-plugin-haraka-plugin-headers
[npm-img]: https://nodei.co/npm/haraka-plugin-haraka-plugin-headers.png
[npm-url]: https://www.npmjs.com/package/haraka-plugin-haraka-plugin-headers
