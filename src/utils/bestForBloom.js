export default (n, p) => {
    const m = Math.ceil((n * Math.log(p)) / Math.log(1 / (2 ** Math.log(2))))
    const k = Math.round((m / n) * Math.log(2))
    return {
        m,
        k,
    }
}