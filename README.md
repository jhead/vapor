# Vapor

Multi-stage web scraping and data extraction with simple and declarative YAML.

## Installation

`yarn add @jhead/vapor`

## Example

In the example below, we start with npmjs.com and load our initial page at
`/search?q=debug`, searching for a 'debug' package. From there, we extract
zero or more links to the package pages, grabbing only the package name
from the URL, to demonstrate some string parsing techniques. For each of the
packages, we fetch the package page on the npm website and extract the
associated GitHub repository URL.

**YAML Declaration**

```yaml
# A name, anything you want
name: npm-example
# Base job URL. Flow URLs will be appended
url: https://www.npmjs.com
# Number of concurrent requests with 'foreach' (see below)
concurrency: 2
# Delay between requests (helps with rate limiting)
delay: 100
# Defines our steps or 'flows' as a list of flow objects
flows:
  # Another name
- name: Search
  # Request definition
  request:
    # Relative or absolute URL
    url: /search?q=debug
    # HTTP request method
    method: get
    # Also supports post and put with form fields...
    # method: post
    # form:
    #   key: value
  # Defines how to select, extract, and transform data from the page HTML
  extract:
    # Each key here corresponds to a key in the result object
    # Uses the 'surgeon' package underneath to extract and transform
    # Each key is exposed to subsequent flows
    packages:
    # Selects some elements with a CSS selector
    - select "[class*=package-list-item] a[href*=package]" {0,}
    # Grabs the href property from each element
    - read property href
    # Splits at / and returns the third piece
    - split / 2
# Our second flow, runs once per item in 'packages' from previous flow
- name: Get package repos
  # Available from previous flow
  foreach: packages
  request:
    # Templated URL supports exposed values from previous flow, as well as
    # the 'foreach' property.
    url: "/package/{foreach}"
    method: get
  extract:
    repo:
    - select "a[class*=sidebarLink]" {0,}[0]
    - read property href
    - trim
```

**JS Usage**

```javascript
import vapor from '@jhead/vapor'

vapor
  .file('npm-example', './npm-example.yaml')
  .then(console.log)
```

**Output**
```javascript
[
  {
    packages: [
      'debug',
      'babel-messages',
      // ...
    ]
  },
  {
    debug: {
      repo: 'https://github.com/visionmedia/debug'
    },
    'babel-messages': {
      repo: 'https://babeljs.io/'
    },
    // ...
 }
]
```
