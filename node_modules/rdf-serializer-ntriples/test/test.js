/* global describe, it */

const assert = require('assert')
const rdf = require('rdf-ext')
const sinkTest = require('rdf-sink/test')
const NTriplesSerializer = require('..')
const Readable = require('readable-stream')

describe('rdf-serializer-ntriples', () => {
  sinkTest(NTriplesSerializer, {readable: true})

  it('should serialize incoming quads', () => {
    const quad = rdf.quad(
      rdf.namedNode('http://example.org/subject'),
      rdf.namedNode('http://example.org/predicate'),
      rdf.literal('object'),
      rdf.namedNode('http://example.org/graph')
    )

    const ntriples = '<http://example.org/subject> <http://example.org/predicate> "object" <http://example.org/graph> .\n'

    let input = new Readable()

    input._readableState.objectMode = true

    input._read = () => {
      input.push(quad)
      input.push(null)
    }

    let serializer = new NTriplesSerializer()
    let stream = serializer.import(input)

    return Promise.resolve().then(() => {
      assert.equal(stream.read().toString(), ntriples)

      return rdf.waitFor(stream)
    })
  })
})
