const Readable = require('readable-stream')

class SimpleDataset {
  constructor (quads, factory) {
    this._quads = []

    if (factory && factory.dataset) {
      this._datasetFactory = factory.dataset
    } else {
      this._datasetFactory = (quads) => {
        return new SimpleDataset(quads, this._datasetFactory)
      }
    }

    if (quads) {
      this.addAll(quads)
    }
  }

  get length () {
    return this._quads.length
  }

  add (quad) {
    if (!this.includes(quad)) {
      this._quads.push(quad)
    }

    return this
  }

  addAll (quads) {
    quads.forEach((quad) => {
      this.add(quad)
    })

    return this
  }

  clone () {
    return this._datasetFactory(this._quads)
  }

  difference (other) {
    return this._datasetFactory(this.filter((quad) => {
      return !other.includes(quad)
    }))
  }

  every (callback) {
    return this._quads.every((quad) => {
      return callback(quad, this)
    })
  }

  filter (callback) {
    return this._datasetFactory(this._quads.filter((quad) => {
      return callback(quad, this)
    }))
  }

  forEach (callback) {
    this._quads.forEach((quad) => {
      callback(quad, this)
    })
  }

  import (stream) {
    return new Promise((resolve, reject) => {
      stream.once('end', () => {
        resolve(this)
      })

      stream.once('error', reject)

      stream.on('data', (quad) => {
        this.add(quad)
      })
    })
  }

  includes (quad) {
    return this.some((other) => {
      return other.equals(quad)
    })
  }

  intersection (other) {
    return this._datasetFactory(this.filter((quad) => {
      return other.includes(quad)
    }))
  }

  map (callback) {
    return this._datasetFactory(this._quads.map((quad) => {
      return callback(quad, this)
    }))
  }

  mapToArray (callback) {
    return this._quads.map((quad) => {
      return callback(quad, this)
    })
  }

  match (subject, predicate, object, graph) {
    return this._datasetFactory(this.filter((quad) => {
      if (subject && !quad.subject.equals(subject)) {
        return false
      }

      if (predicate && !quad.predicate.equals(predicate)) {
        return false
      }

      if (object && !quad.object.equals(object)) {
        return false
      }

      if (graph && !quad.graph.equals(graph)) {
        return false
      }

      return true
    }))
  }

  merge (other) {
    return (this._datasetFactory(this._quads)).addAll(other)
  }

  remove (quad) {
    let index = this._quads.findIndex((other) => {
      return other.equals(quad)
    })

    if (index !== -1) {
      this._quads.splice(index, 1)
    }

    return this
  }

  removeMatches (subject, predicate, object, graph) {
    this.match(subject, predicate, object, graph).forEach((quad) => {
      this.remove(quad)
    })

    return this
  }

  some (callback) {
    return this._quads.some((quad) => {
      return callback(quad, this)
    })
  }

  toArray () {
    return this._quads.slice()
  }

  toStream () {
    let stream = new Readable({
      objectMode: true,
      read: () => {
        this.forEach((quad) => {
          stream.push(quad)
        })

        stream.push(null)
      }
    })

    return stream
  }
}

module.exports = SimpleDataset
