module.exports.build = (app, fs, execute_query) => {
    const md5 = require('md5');
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = fs.readFileSync('./jwt-secret.txt');

    const getUserByUserId = (id) => {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM castellers WHERE id = ${id}`;
            execute_query(query, (result) => resolve(result[0] || null));
        });
    };      

    const authMiddleware = (req, res, next) => {
        const token = req.cookies.token;
        
        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ error: "Unauthorized" });
        }
    };
    
    app.get("/protected", authMiddleware, (req, res) => {
        res.status(200).json({ message: "You have access to this protected route" });
    });

    app.post("/auth/isLoggedIn", async (req, res) => {
      const { token } = req.body;

      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      try {
          const decoded = jwt.verify(token, JWT_SECRET);
          req.user = decoded;

          res.status(200).json({
            message: "You have access to this protected route",
            isLoggedIn: true,
            userId: decoded.id
          });
      } catch (error) {
          res.status(401).json({ error: "Unauthorized" });
      }
    });

    app.post("/auth/login", async (req, res) => {
        const { userId, password } = req.body;
      
        // Check if user exists in your database
        const user = await getUserByUserId(userId);
        if (!user) {
          return res.status(400).json({ error: "USER_NO_EXISTS" });
        }
      
        // Compare the provided password with the stored hash
        const validPassword = md5(password) === user.md5pass;
        if (!validPassword) {
          return res.status(400).json({ error: "WRONG_PASSWORD" });
        }
      
        // Generate JWT token
        const token = jwt.sign({ id: user.id }, JWT_SECRET, {
          expiresIn: "365d"
        });

        res.status(200).json({ message: "Login successful", token: token, userId: user.id });
      });      
}