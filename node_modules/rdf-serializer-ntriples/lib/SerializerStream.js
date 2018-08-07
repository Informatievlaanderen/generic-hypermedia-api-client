const Readable = require('readable-stream')

class SerializerStream extends Readable {
  constructor (input) {
    super()

    this._read = () => {}

    input.on('data', (quad) => {
      this.push(quad.toCanonical() + '\n')
    })

    input.on('end', () => {
      this.push(null)
    })

    input.on('error', (err) => {
      this.emit('error', err)
    })
  }
}

module.exports = SerializerStream
