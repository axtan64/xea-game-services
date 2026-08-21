module.exports = function(req, res, next) {
    const authorization = req.headers["authorization"]

    if(!authorization || !authorization.startsWith("Bearer "))
        return res.status(401).json({ error: "Unauthorized" });

    const token = authorization.split(" ")[1]

    if(token !== process.env.ROBLOX_AUTH)
        return res.status(403).json({ error: "Invalid API key" });

    next()
}