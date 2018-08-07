/* global describe, it */

const assert = require('assert')
const rdf = require('rdf-ext')
const stringToStream = require('string-to-stream')
const testData = require('rdf-test-data')
const N3Parser = require('..')

describe('N3 parser', () => {
  const simpleNTGraph = '<http://example.org/subject> <http://example.org/predicate> "object" .'
  const simpleNQGraph = '<http://example.org/subject> <http://example.org/predicate> "object" <http://example.org/graph> .'

  it('.import should parse the given string triple stream', (done) => {
    const parser = new N3Parser({factory: rdf})
    const quads = []

    parser.import(stringToStream(simpleNTGraph)).on('data', (quad) => {
      quads.push(quad)
    }).on('end', () => {
      if (quads.length !== 1) {
        done('no triple streamed')
      } else {
        assert.equal(quads[0].toString(), simpleNTGraph)

        done()
      }
    }).on('error', (error) => {
      done(error)
    })
  })

  it('.import should parse the given string quad stream', (done) => {
    const parser = new N3Parser({factory: rdf})
    const quads = []

    parser.import(stringToStream(simpleNQGraph)).on('data', (quad) => {
      quads.push(quad)
    }).on('end', () => {
      if (quads.length !== 1) {
        done('no quad streamed')
      } else {
        assert.equal(quads[0].toString(), simpleNQGraph)

        done()
      }
    }).on('error', (error) => {
      done(error)
    })
  })

  it('.import should handle parser errors', (done) => {
    let parser = new N3Parser()

    parser.import(stringToStream('1.')).resume().on('end', () => {
      done('end event emitted')
    }).on('error', (error) => {
      assert(error)

      done()
    })
  })

  it('static .import parse the given string stream', (done) => {
    let counter = 0

    N3Parser.import(stringToStream(simpleNTGraph)).on('data', () => {
      counter++
    }).on('end', () => {
      if (counter !== 1) {
        done('no triple streamed')
      } else {
        done()
      }
    }).on('error', (error) => {
      done(error)
    })
  })

  describe('example data', () => {
    it('card.ttl should be parsed', () => {
      let parser = new N3Parser({baseIRI: 'https://www.example.com/john/card'})

      return testData.stream('text/turtle', 'card').then((stream) => {
        return rdf.dataset().import(parser.import(stream)).then((parsed) => {
          assert(testData.card.equals(parsed))
        })
      })
    })

    it('list.ttl should be parsed', () => {
      let parser = new N3Parser({baseIRI: 'https://www.example.com/list'})

      return testData.stream('text/turtle', 'list').then((stream) => {
        return rdf.dataset().import(parser.import(stream)).then((dataset) => {
          assert(testData.list.equals(dataset))
        })
      })
    })
  })
})
