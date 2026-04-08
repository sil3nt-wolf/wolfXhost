require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bodyParser = require('body-parser');
const cron = require('node-cron');
const path = require('path');

const {updateApiKeyStatus, checkApiKeyValidity} = require('./api/routes/apis/apiStatus.js')
const pool = require('./api/database/sqlConnection.js');
const installRoutes = require('./api/routes/installRoutes');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(bodyParser.json());
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));  


if (process.env.DB_HOST) {
    const sessionStore = new MySQLStore({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        clearExpired: true,
        checkExpirationInterval: 900000,
        expiration: 5 * 24 * 60 * 60 * 1000,
    });
    app.use(session({
        key: 'talkdrove-session',
        secret: process.env.SESSION_SECRET,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 5 * 24 * 60 * 60 * 1000
        }
    }));
}


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use('/', installRoutes);


const dashboard = require('./api/routes/dashboardRoutes.js');
const totalUsers = require('./api/routes/apis/totalUsers.js')
const lander = require('./api/routes/landerRoutes.js');
const moderator = require('./api/routes/moderatorsRoutes.js');
const authRoutes = require('./api/routes/authRoutes.js')
const admin = require('./api/routes/adminRoutes.js')
const botDetails = require('./api/routes/apis/userApis/apps/botDetails.js');
const subscribe = require('./api/routes/apis/userApis/earnCoins/subscribeTalkDrove.js');




const login = require('./api/routes/apis/auth/login.js');
const resetPassword = require('./api/routes/apis/auth/resetPassword.js');
const signup = require('./api/routes/apis/auth/signup.js')

const { router } = require('./api/routes/apis/auth/emailRoute.js')
const checkBan = require('./api/routes/apis/auth/checkBan.js')
const checkUsername = require('./api/routes/apis/auth/checkUsername.js')
const checkLogin = require('./api/routes/apis/auth/checkLogin.js')

const userApps = require('./api/routes/apis/userApis/apps/apps.js');
const userCoins = require('./api/routes/apis/userApis/userCoins.js');
const claimCoins = require('./api/routes/apis/userApis/claimCoins.js');
const logout = require('./api/routes/apis/userApis/logout.js');
const countries = require('./api/routes/apis/userApis/countries.js');
const invite = require('./api/routes/apis/userApis/invite/invite.js');
const depositRequest = require('./api/routes/apis/userApis/depositRequest.js');
const reportBots = require('./api/routes/apis/userApis/reportBots.js');
const transferFromTalkDrove = require('./api/routes/apis/userApis/transferFromTalkDrove.js');
const contactUs = require('./api/routes/apis/userApis/contactUs.js');
const walletRoutes = require('./api/routes/apis/userApis/walletRoutes.js');
const checkAppName = require('./api/routes/apis/userApis/checkAppName.js');
const selectBot = require('./api/routes/selectBot.js');
const prepareDeployment = require('./api/routes/prepareDeployment.js');
const devices = require('./api/routes/apis/devices.js')
const serverStats = require('./api/routes/apis/serversStats.js')

const deploy = require('./api/routes/apis/deploymentApis/deploy.js')

const appLogs = require('./api/routes/apis/userApis/apps/appLogs.js')
const appTerminal = require('./api/routes/apis/userApis/apps/appTerminal.js')
const deleteAppRoute = require('./api/routes/apis/userApis/apps/deleteAppRoute.js')
const apps = require('./api/routes/apis/userApis/apps/apps.js')

const notificationRoutes = require('./api/routes/apis/userApis/notificationsRoutes.js');
const checkoutAndWebHook = require('./api/routes/apis/checkoutAndWebHook.js');
const shareBot = require('./api/routes/apis/userApis/shareBot.js');
const buyHeroku = require('./api/routes/apis/userApis/buyHeroku.js');
const myHeroku = require('./api/routes/apis/userApis/myHeroku.js');
const botRequests = require('./api/routes/apis/userApis/botRequests.js');
const configVars = require('./api/routes/apis/userApis/apps/configVars.js');
const favoriteBot = require('./api/routes/apis/userApis/favoriteBot.js');
const updateUser = require('./api/routes/apis/userApis/updateUser.js');
const userBannedAppeal = require('./api/routes/apis/userApis/userBannedAppeal.js');
const supportSystem = require('./api/routes/apis/userApis/supportSystem.js');
const user = require('./api/routes/apis/userApis/user.js');

const allbots = require('./api/routes/apis/admin/allBots.js');
const manageBots = require('./api/routes/apis/admin/manageBots.js');
const botReports = require('./api/routes/apis/admin/botReports.js');
const herokuAccounts = require('./api/routes/apis/admin/herokuAccounts.js');
const users = require('./api/routes/apis/admin/users.js');
const apiKeysRoutes = require('./api/routes/apis/admin/apiKeysRoutes.js');
const notifications = require('./api/routes/apis/admin/notifications.js');
const suspendBots = require('./api/routes/apis/admin/suspendBots.js');
const bannedAppeal = require('./api/routes/apis/admin/bannedAppeal.js');
const manageProducts = require('./api/routes/apis/admin/payment/addProducts.js');

const supportSystemManage = require('./api/routes/apis/admin/supportSystemManage.js');


const botModerator = require('./api/routes/apis/moderator/botModerator.js');
const manageModerator = require('./api/routes/apis/admin/manageModerator.js');






app.use('/', lander);
app.use('/auth', authRoutes);
app.use('/dashboard', dashboard);
app.use('/moderator', moderator);
app.use('/hamza', admin);
app.use('/', selectBot);
app.use('/', prepareDeployment);



app.use('/', login);
app.use('/', signup);

app.use('/', router);
app.use('/', checkBan);
app.use('/', checkUsername);
app.use('/', resetPassword);
app.use('/', checkLogin);




app.use('/', userApps);
app.use('/', checkoutAndWebHook);

app.use('/', totalUsers);
app.use('/', userCoins);
app.use('/', claimCoins);
app.use('/', logout);
app.use('/', countries);
app.use('/', invite);
app.use('/', depositRequest);
app.use('/', reportBots);
app.use('/', transferFromTalkDrove);
app.use('/', contactUs);
app.use('/', walletRoutes);
app.use('/', devices);
app.use('/', serverStats);


app.use('/', deploy);


app.use('/', botDetails);
app.use('/', subscribe);
app.use('/', apps);
app.use('/', appLogs);
app.use('/', appTerminal);
app.use('/', deleteAppRoute);



app.use('/', notificationRoutes);
app.use('/', shareBot);
app.use('/', myHeroku);
app.use('/', botRequests);
app.use('/', configVars);
app.use('/', favoriteBot);
app.use('/', buyHeroku);
app.use('/', user);
app.use('/', updateUser);
app.use('/', userBannedAppeal);
app.use('/', supportSystem);
app.use('/', checkAppName);





app.use('/', allbots);
app.use('/', herokuAccounts);
app.use('/', manageProducts);
app.use('/api', manageBots);
app.use('/', users);
app.use('/', botReports);
app.use('/', apiKeysRoutes);
app.use('/', notifications);
app.use('/', suspendBots);
app.use('/', bannedAppeal);
app.use('/', supportSystemManage);






app.use('/', botModerator);
app.use('/', manageModerator);



































app.use((req, res, next) => {
    res.status(404).render('404', { url: req.originalUrl });
});





app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
