// URL helpers ported from vue-router (MIT, https://github.com/vuejs/router)
// so that locations are parsed, encoded and resolved exactly like the Vue app
// does. The redirect logic depends on these semantics.

export type LocationQueryValue = string | null
export type LocationQuery = Record<string, LocationQueryValue | LocationQueryValue[]>

const HASH_RE = /#/g
const AMPERSAND_RE = /&/g
const EQUAL_RE = /=/g
const PLUS_RE = /\+/g
const ENC_BRACKET_OPEN_RE = /%5B/g
const ENC_BRACKET_CLOSE_RE = /%5D/g
const ENC_CARET_RE = /%5E/g
const ENC_BACKTICK_RE = /%60/g
const ENC_CURLY_OPEN_RE = /%7B/g
const ENC_PIPE_RE = /%7C/g
const ENC_CURLY_CLOSE_RE = /%7D/g
const ENC_SPACE_RE = /%20/g

function commonEncode(text: string | number | null | undefined): string {
  return text == null
    ? ''
    : encodeURI('' + text)
        .replace(ENC_PIPE_RE, '|')
        .replace(ENC_BRACKET_OPEN_RE, '[')
        .replace(ENC_BRACKET_CLOSE_RE, ']')
}

export function encodeHash(text: string): string {
  return commonEncode(text)
    .replace(ENC_CURLY_OPEN_RE, '{')
    .replace(ENC_CURLY_CLOSE_RE, '}')
    .replace(ENC_CARET_RE, '^')
}

export function encodeQueryValue(text: string | number): string {
  return commonEncode(text)
    .replace(PLUS_RE, '%2B')
    .replace(ENC_SPACE_RE, '+')
    .replace(HASH_RE, '%23')
    .replace(AMPERSAND_RE, '%26')
    .replace(ENC_BACKTICK_RE, '`')
    .replace(ENC_CURLY_OPEN_RE, '{')
    .replace(ENC_CURLY_CLOSE_RE, '}')
    .replace(ENC_CARET_RE, '^')
}

export function encodeQueryKey(text: string | number): string {
  return encodeQueryValue(text).replace(EQUAL_RE, '%3D')
}

export function decode(text: string): string {
  try {
    return decodeURIComponent('' + text)
  } catch {
    return '' + text
  }
}

export function parseQuery(search: string): LocationQuery {
  const query: LocationQuery = {}
  if (search === '' || search === '?') return query
  const searchParams = (search[0] === '?' ? search.slice(1) : search).split('&')
  for (const rawParam of searchParams) {
    const searchParam = rawParam.replace(PLUS_RE, ' ')
    const eqPos = searchParam.indexOf('=')
    const key = decode(eqPos < 0 ? searchParam : searchParam.slice(0, eqPos))
    const value = eqPos < 0 ? null : decode(searchParam.slice(eqPos + 1))
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      let currentValue = query[key]
      if (!Array.isArray(currentValue)) currentValue = query[key] = [currentValue]
      currentValue.push(value)
    } else {
      query[key] = value
    }
  }
  return query
}

export function stringifyQuery(query: LocationQuery): string {
  let search = ''
  for (const rawKey in query) {
    const value = query[rawKey]
    const key = encodeQueryKey(rawKey)
    if (value == null) {
      if (value !== undefined) search += (search.length ? '&' : '') + key
      continue
    }
    const values = Array.isArray(value)
      ? value.map((v) => v && encodeQueryValue(v))
      : [value && encodeQueryValue(value)]
    for (const v of values) {
      if (v !== undefined) {
        search += (search.length ? '&' : '') + key
        if (v != null) search += '=' + v
      }
    }
  }
  return search
}

export function resolveRelativePath(to: string, from: string): string {
  if (to.startsWith('/')) return to
  if (!from.startsWith('/')) return to
  if (!to) return from

  const fromSegments = from.split('/')
  const toSegments = to.split('/')
  const lastToSegment = toSegments[toSegments.length - 1]
  if (lastToSegment === '..' || lastToSegment === '.') toSegments.push('')

  let position = fromSegments.length - 1
  let toPosition: number
  for (toPosition = 0; toPosition < toSegments.length; toPosition++) {
    const segment = toSegments[toPosition]
    if (segment === '.') continue
    if (segment === '..') {
      if (position > 1) position--
    } else break
  }

  return (
    fromSegments.slice(0, position).join('/') +
    '/' +
    toSegments.slice(toPosition).join('/')
  )
}

export interface ParsedURL {
  fullPath: string
  path: string
  query: LocationQuery
  hash: string
}

export function parseURL(location: string, currentLocation = '/'): ParsedURL {
  let path: string | undefined
  let query: LocationQuery = {}
  let searchString = ''
  let hash = ''

  const hashPos = location.indexOf('#')
  let searchPos = location.indexOf('?')
  searchPos = hashPos >= 0 && searchPos > hashPos ? -1 : searchPos

  if (searchPos >= 0) {
    path = location.slice(0, searchPos)
    searchString = location.slice(searchPos, hashPos > 0 ? hashPos : location.length)
    query = parseQuery(searchString.slice(1))
  }
  if (hashPos >= 0) {
    path = path || location.slice(0, hashPos)
    hash = location.slice(hashPos, location.length)
  }

  path = resolveRelativePath(path != null ? path : location, currentLocation)

  return { fullPath: path + searchString + hash, path, query, hash: decode(hash) }
}

/** Returns the first value of a query parameter (vue-router keeps arrays). */
export function firstQueryValue(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): LocationQueryValue | undefined {
  return Array.isArray(value) ? value[0] : value
}
