# 🎯 Amrita AttendEase - Enhanced UI/UX

A modern Chrome extension to track your Amrita attendance with beautiful, intuitive design and smart bunking calculations.

## 🚀 New Features (v1.1)

### ✨ Enhanced UI/UX
- **Modern Card Design**: Revamped subject cards with gradient backgrounds and hover effects
- **Improved Layout**: Course info on the left, attendance percentage on the right
- **Smart Bunk Display**: Large, prominent "Go Bunk X classes" feature
- **Visual Progress Bars**: Color-coded attendance bars with 75% target line
- **Better Typography**: Improved fonts, spacing, and readability

### 🎨 Design Improvements
- **Gradient Backgrounds**: Beautiful gradients for status indicators
- **Enhanced Shadows**: Subtle shadows and depth for better visual hierarchy
- **Responsive Design**: Better spacing and layout for different screen sizes
- **Color-Coded Status**: Green (Safe), Orange (Warning), Red (Danger)

## ⚡ Quick Installation

1. **Open Chrome** → Go to `chrome://extensions/`
2. **Enable Developer Mode** (toggle top-right)
3. **Click "Load unpacked"** → Select this folder
4. **Done!** Extension is ready to use

## � How to Use

1. **Login** to your Amrita portal: `https://my.amrita.edu/index/login`
2. **Visit** attendance page: `https://students.amrita.edu/client/class-attendance`  
3. **Widget appears automatically** on the right side of the page
4. **Click extension icon** in toolbar for popup summary

## ✨ Features

- **Real-time calculations**: Shows how many classes you can bunk
- **Smart status**: Green (Safe), Yellow (Warning), Red (Danger)  
- **Floating widget**: Movable widget on attendance page
- **Popup summary**: Quick overview when clicking extension icon

## 🔧 Files

- `manifest.json` - Extension configuration
- `content.js` - Main logic (scrapes attendance data)
- `popup.html/js` - Popup interface  
- `styles.css` - Styling

## 📊 Calculations

- **Safe (≥80%)**: "You can bunk X more classes and stay ≥75%"
- **Warning (75-80%)**: "Be careful, limited bunks available"
- **Danger (<75%)**: "Attend X consecutive classes to reach 75%"

## 🛠️ Troubleshooting

- **Widget not showing?** Refresh the attendance page
- **No data?** Make sure you're logged into Amrita portal
- **Errors?** Check browser console (F12)

---

**Made for Amrita students by students! 🎓**
