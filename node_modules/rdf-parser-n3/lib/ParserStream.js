const rdf = require('rdf-data-model')
const Readable = require('readable-stream')
const N3 = require('n3')

function term (factory, rawNode, blankNodes) {
  if (N3.Util.isIRI(rawNode)) {
    return factory.namedNode(rawNode)
  } else if (N3.Util.isBlank(rawNode)) {
    if (!(rawNode in blankNodes)) {
      blankNodes[rawNode] = factory.blankNode()
    }

    return blankNodes[rawNode]
  } else {
    return factory.literal(N3.Util.getLiteralValue(rawNode), N3.Util.getLiteralLanguage(rawNode) || N3.Util.getLiteralType(rawNode))
  }
}

class ParserStream extends Readable {
  constructor (input, options) {
    super({
      objectMode: true
    })

    options = options || {}

    if (!('importPrefixMap' in options)) {
      options.importPrefixMap = true
    }

    let baseIRI = options.baseIRI || ''
    let factory = options.factory || rdf

    input.on('error', (err) => {
      this.emit('error', err)
    })

    let parser = new N3.Parser({documentIRI: baseIRI})
    let blankNodes = {}

    parser.parse(input, (err, rawQuad, rawPrefixes) => {
      if (err) {
        return this.emit('error', err)
      }

      if (!rawQuad) {
        return this.push(null)
      }

      this.push(factory.quad(
        term(factory, rawQuad.subject, blankNodes),
        term(factory, rawQuad.predicate, blankNodes),
        term(factory, rawQuad.object, blankNodes),
        rawQuad.graph ? term(factory, rawQuad.graph, blankNodes) : factory.defaultGraph()
      ))
    })
  }

  _read () {
  }
}

module.exports = ParserStream
