import { isUrlMatch } from './regex.utils'

describe('RegexUtils', () => {
  describe('isUrlMatch', () => {
    it('should match http URLs', () => {
      expect(isUrlMatch('http://example.com')).toBe(true)
    })

    it('should match https URLs', () => {
      expect(isUrlMatch('https://example.com')).toBe(true)
    })

    it('should match URLs with subdomains', () => {
      expect(isUrlMatch('https://sub.example.com')).toBe(true)
      expect(isUrlMatch('https://deep.sub.example.com')).toBe(true)
    })

    it('should match URLs with paths', () => {
      expect(isUrlMatch('https://example.com/path/to/page')).toBe(true)
    })

    it('should match URLs with query parameters', () => {
      expect(isUrlMatch('https://example.com?query=value')).toBe(true)
      expect(isUrlMatch('https://example.com?query=value&key=123')).toBe(true)
    })

    it('should match URLs with fragments', () => {
      expect(isUrlMatch('https://example.com#section')).toBe(true)
    })

    it('should match URLs with ports', () => {
      expect(isUrlMatch('https://example.com:8080/path')).toBe(true)
    })

    it('should match URLs with long TLDs', () => {
      expect(isUrlMatch('https://example.engineering')).toBe(true)
      expect(isUrlMatch('https://example.international')).toBe(true)
    })

    it('should match URLs with hyphens in domain', () => {
      expect(isUrlMatch('https://my-example.com')).toBe(true)
    })

    it('should match URLs with special characters in path', () => {
      expect(isUrlMatch('https://example.com/path%20with%20spaces')).toBe(true)
      expect(isUrlMatch('https://example.com/path+with+plus')).toBe(true)
      expect(isUrlMatch('https://example.com/~user')).toBe(true)
    })

    it('should reject empty string', () => {
      expect(isUrlMatch('')).toBe(false)
    })

    it('should reject URLs without protocol', () => {
      expect(isUrlMatch('example.com')).toBe(false)
    })

    it('should reject ftp protocol', () => {
      expect(isUrlMatch('ftp://example.com')).toBe(false)
    })

    it('should reject arbitrary text', () => {
      expect(isUrlMatch('hello world')).toBe(false)
    })

    it('should reject bare protocol', () => {
      expect(isUrlMatch('http://')).toBe(false)
    })

    it('should reject URLs with no TLD', () => {
      expect(isUrlMatch('https://example.')).toBe(false)
    })
  })
})
