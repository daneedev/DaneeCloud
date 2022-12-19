const localstrategy = require("passport-local").Strategy
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
    passport.use(new localstrategy({ usernameField: "name"}), authUser)
    passport.serializeUser((user, done) => {})
    passport.deserializeUser((id, done) => {})
}

module.exports = initialize