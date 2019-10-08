export default (o) => {
    let obj = o
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
        if (typeof obj[keys[i]] === "string" && ["true", "True", "false", "False"].includes(obj[keys[i]])) {
            obj[keys[i]] = obj[keys[i]].toLowerCase() === "true"
        }
    }
    return obj
}