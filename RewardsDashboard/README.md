# Campus Rewards Dashboard

A comprehensive, responsive rewards dashboard for campus communities. This system allows students to view, claim rewards, and participate in campus-wide competitions based on their merit levels (etiocracy).

## 🏆 Features

### 📊 **Dashboard Overview**
- Real-time statistics showing available rewards, claimed rewards, campus ranking, and merit level
- Monthly competition tracking with campus leaderboards
- Beautiful gradient design with responsive cards

### 🎁 **Rewards System**
- **4-Level Reward Structure**: Progressive rewards unlock as campus merit levels increase
- **Campus-Based Rewards**: Separate reward pools for North, South, East, and West campuses
- **Smart Filtering**: Filter by campus, level, and availability status
- **Like System**: Users can like rewards to show popularity (❤️ button)
- **Visual Status**: Colorful cards for available rewards, grayscale for claimed ones

### � **User Authentication**
- Secure login system with campus selection
- Personalized dashboard experience
- Session persistence with localStorage
- Guest browsing with limited features

### 📝 **Reward Requests**
- **Logged-in users** can submit new reward requests
- Form includes title, description, suggested level, and justification
- Pending requests tracking for users
- Admin approval workflow

### 🏅 **Leaderboard System**
- **Campus Rankings**: See which campus is winning monthly competitions
- **House Rankings**: Track individual house performance within campuses
- **Trend Indicators**: Visual arrows showing performance trends
- **Real-time Points**: Live point tracking and ranking updates

### 🛠️ **Admin Panel**
- **Secure Admin Access**: Password-protected admin interface
- **Reward Management**: Add, edit, and delete rewards with image support
- **Request Approval**: Review and approve/reject user-submitted reward requests
- **Analytics Dashboard**: View total rewards, active users, and pending requests
- **Bulk Operations**: Manage multiple rewards and requests efficiently

## 🎨 Design Features

- **Mobile-First Responsive Design**: Optimized for all device sizes
- **Modern UI/UX**: Clean cards, smooth animations, and intuitive navigation
- **Accessibility**: Screen reader friendly, keyboard navigation support
- **Visual Hierarchy**: Clear reward levels with distinct styling
- **Status Indicators**: Color-coded reward availability
- **Interactive Elements**: Hover effects, modal dialogs, and smooth transitions

## 📁 Project Structure

```
RewardsDashboard/
├── index.html              # Main dashboard page
├── css/
│   └── styles.css          # Complete responsive stylesheet
├── js/
│   ├── script.js           # Core dashboard functionality
│   ├── rewards.js          # Reward management system
│   └── admin.js            # Administrative functions
├── .github/
│   └── copilot-instructions.md # Development guidelines
└── README.md               # This documentation
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome 60+, Firefox 60+, Safari 12+, Edge 79+)
- Local web server (recommended for development)

### Installation
1. **Clone or download** the project files
2. **Navigate** to the project directory
3. **Start local server**:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```
4. **Open browser** and visit `http://localhost:8000`

### Demo Credentials
- **User Login**: Any email with any of the campus options
- **Admin Access**: Password is `admin123`

## 🏛️ Campus System

### Campuses
- **North Campus** 🏔️ - Currently leading with 1,240 points
- **South Campus** 🌴 - Second place with 1,180 points  
- **East Campus** 🌅 - Third place with 980 points
- **West Campus** 🌄 - Fourth place with 890 points

### Merit Levels
1. **Level 1** 🌟 - Basic rewards (coffee vouchers, study rooms)
2. **Level 2** ⭐ - Enhanced rewards (meal credits, parking passes)
3. **Level 3** 💫 - Premium rewards (event tickets, textbook vouchers)
4. **Level 4** 🎯 - Exclusive rewards (scholarships, semester parking)

### House System
Each campus has multiple houses competing for additional recognition:
- Phoenix House, Dragon House, Griffin House, etc.
- Individual house rankings and trend tracking
- Cross-campus house competitions

## 💻 Technical Features

### Frontend Technologies
- **HTML5**: Semantic structure with accessibility features
- **CSS3**: Grid/Flexbox layouts, custom properties, animations
- **Vanilla JavaScript**: ES6+ with modular architecture
- **Font Awesome**: Icon library for UI elements
- **Google Fonts**: Inter font family for typography

### Responsive Breakpoints
- **Mobile**: 320px - 480px (single column, hamburger menu)
- **Tablet**: 481px - 768px (adapted layouts, touch-friendly)
- **Desktop**: 769px+ (full multi-column experience)

### Data Management
- **LocalStorage**: User sessions, preferences, and temporary data
- **State Management**: Centralized state with `DashboardState` object
- **Mock API**: Simulated backend responses for demo purposes

### Performance Features
- **Lazy Loading**: Images load as needed
- **Debounced Events**: Optimized scroll and resize handlers  
- **Efficient Rendering**: Minimal DOM manipulation
- **CSS Animations**: Hardware-accelerated transitions

## 🔧 Customization

### Adding New Rewards
1. **Admin Panel**: Use the web interface (Admin Login → Manage Rewards)
2. **Code**: Add to `SAMPLE_REWARDS` array in `rewards.js`
3. **API Integration**: Replace localStorage with real API calls

### Styling Changes
- **Colors**: Update CSS custom properties in `styles.css`
- **Layout**: Modify grid and flexbox configurations
- **Typography**: Change font families and sizes
- **Animations**: Adjust transition durations and effects

### Campus Configuration
- **Add Campus**: Update campus arrays in JavaScript files
- **Modify Houses**: Edit `HOUSE_DATA` in `rewards.js`
- **Change Levels**: Adjust level ranges and requirements

## 🔐 Security Considerations

### Current Implementation (Demo)
- **Simple Authentication**: Basic form validation
- **LocalStorage**: Client-side data persistence
- **Admin Password**: Hardcoded for demonstration

### Production Recommendations
- **JWT Tokens**: Secure authentication with server validation
- **Database**: Replace localStorage with secure backend database
- **Input Sanitization**: Validate and sanitize all user inputs
- **HTTPS**: Ensure encrypted connections
- **Role-Based Access**: Implement proper user roles and permissions

## 📱 Browser Support

- ✅ **Chrome** 60+ (Full support)
- ✅ **Firefox** 60+ (Full support)  
- ✅ **Safari** 12+ (Full support)
- ✅ **Edge** 79+ (Full support)
- ⚠️ **IE 11** (Basic functionality, limited animations)

## 🎯 Future Enhancements

### Planned Features
- **Real-time Notifications**: Push notifications for new rewards
- **Social Features**: Share achievements, comment on rewards
- **Mobile App**: Native iOS/Android applications
- **Analytics**: Advanced reporting and insights
- **Gamification**: Badges, streaks, and achievement systems
- **Integration**: Connect with campus management systems

### Technical Improvements
- **Backend API**: Node.js/Express or Python/Django backend
- **Database**: PostgreSQL or MongoDB for data persistence
- **Authentication**: OAuth2 integration with campus systems
- **Real-time Updates**: WebSocket connections for live data
- **Image Uploads**: File handling for reward images
- **Email Notifications**: Automated email system

## 🤝 Contributing

1. **Fork** the project
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow the existing code style and structure
- Test across different devices and browsers
- Update documentation for new features
- Ensure accessibility compliance
- Optimize for performance

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support & Contact

- **Issues**: Create GitHub issues for bugs and feature requests
- **Documentation**: Check this README for comprehensive information
- **Community**: Join our campus developer community

---

**🎓 Built for Campus Communities** - Empowering students through recognition and rewards!

> **Note**: This is a demonstration application. Replace mock data and localStorage with real backend services before deploying to production.
