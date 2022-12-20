const LocalStrategy = require("passport-local").Strategy
const users = require("./models/users")
const bcrypt = require("bcrypt")

function initialize(passport) {
    const authUser = async (username, password, done) => {
        const user = await users.findOne({ username: username})
        if (!user) {
            return done(null, false, {message: "No user with that username"})
        }

        try {
            if (await bcrypt.compare(password, user.password)) {
                return done(null, user)
            } else {
                return done (null, false, { message: "Password is incorrect"})
            }
        } catch (err) {
            return done(err)
        }
    }
    passport.use(new LocalStrategy({ usernameField: "name"}, authUser))
    passport.serializeUser((user, done) => done(null, user.id))
    passport.deserializeUser(async (id, done) => {
        const userfindedbyid = await users.findOne({ id: id})
        return done(null, userfindedbyid)
    })
}

module.exports = initialize