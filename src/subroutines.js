export default {

  split: (input, [ delim, i ]) => {
    delim = delim || ''

    let output = input.split(delim)

    if (i != null) {
      return output[i]
    } else {
      return output
    }
  },

  trim: input => `${input}`.replace(/\s+/g, '').trim()

}
