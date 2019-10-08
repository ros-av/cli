import md5File from "md5-file"

import Promise from "bluebird"

export default Promise.promisify(md5File)