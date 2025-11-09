# Recording Limit - Visual User Guide

## 🎯 Target: 60 Minutes (3600 seconds)

### What You'll See

---

## 📊 Progress Indicator (Always Visible)

Located at the top of the Speak page, you'll see:

```
┌─────────────────────────────────────────────────────┐
│  Progress                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  current: 3    total: 45    today: 3                │
├─────────────────────────────────────────────────────┤
│  Session Progress                                    │
│  ████████████░░░░░░░░░░  3/10                       │
├─────────────────────────────────────────────────────┤
│  ⏱️ Recording Time Target                            │
│  45:30 / 60:00                                       │
│  ████████████████████████████░░░░░░░  75.8%         │
│  15 min remaining                                    │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 Color Coding

### 🔵 Blue/Purple (0-44 minutes)
```
Progress: ████████████████░░░░░░░░░░░░ 66.7%
Status: Keep going! You're making great progress
Color: Blue gradient
```

### 🟡 Yellow/Orange (45-59 minutes)
```
Progress: ████████████████████████████░░ 93.3%
Status: Almost there! Just a few minutes left
Color: Yellow/Orange gradient (warning)
```

### 🟢 Green (60 minutes - Complete!)
```
Progress: ██████████████████████████████ 100%
Status: 🎉 Target Completed!
Color: Green gradient
```

---

## 📝 User Journey

### Stage 1: Getting Started (0-15 min)
```
Time: 0:00 / 60:00
Progress: [░░░░░░░░░░░░░░░░░░░░] 0.0%
Message: "60 min remaining"
Action: Record freely!
```

### Stage 2: Making Progress (15-30 min)
```
Time: 22:30 / 60:00
Progress: [████████░░░░░░░░░░░░] 37.5%
Message: "38 min remaining"
Action: Keep recording!
```

### Stage 3: Halfway There (30-45 min)
```
Time: 37:45 / 60:00
Progress: [██████████████░░░░░░] 62.9%
Message: "23 min remaining"
Action: You're over halfway!
```

### Stage 4: Final Push (45-55 min)
```
Time: 48:20 / 60:00
Progress: [███████████████████░] 80.6%
Color: ⚠️ Changes to Yellow/Orange
Message: "12 min remaining"
Action: Almost done!
```

### Stage 5: Last Few Minutes (55-60 min)
```
Time: 57:15 / 60:00
Progress: [███████████████████░] 95.4%
Color: 🟡 Bright Orange
Message: "3 min remaining"
Action: Final recordings!
```

### Stage 6: Completion (60+ min)
```
Time: 60:00 / 60:00
Progress: [████████████████████] 100%
Color: 🟢 Green
Message: "🎉 Target Completed!"
Action: Show congratulations screen
```

---

## 🚫 What Happens When You Reach the Limit?

### Scenario 1: Exactly at 60:00
```
You submit your final recording
↓
Progress bar turns green
↓
Page automatically refreshes
↓
Congratulations screen appears!
```

### Scenario 2: Would Exceed Limit
```
Current time: 59:30 (59.5 minutes)
You record: 45 seconds
Total would be: 60:15 (exceeds 60:00)
↓
❌ ERROR MESSAGE:
"Recording would exceed the 1-hour limit.
 You have 30.0 seconds (0.5 minutes) remaining."
↓
Options:
- Record a shorter clip (under 30 seconds)
- Submit what you have
```

---

## 🎉 Completion Screen

When you reach 60 minutes, you'll see:

```
┌─────────────────────────────────────────────────────┐
│                        🎉                            │
│               Congratulations!                       │
│   You've completed the 1-hour recording target      │
├─────────────────────────────────────────────────────┤
│            Your Achievement                          │
│                                                      │
│   60:15          45          100%                   │
│   Total Time   Recordings   Complete                │
├─────────────────────────────────────────────────────┤
│  ✨ You've successfully contributed 60 minutes      │
│  of voice data to help build better speech          │
│  recognition for the Luo language!                   │
│                                                      │
│  Thank you for your valuable contribution to this    │
│  important project.                                  │
├─────────────────────────────────────────────────────┤
│  [Return to Dashboard]  [View My Stats]             │
└─────────────────────────────────────────────────────┘
```

---

## 💡 Pro Tips

### Tip 1: Check Your Progress Anytime
The progress bar is always visible at the top of the Speak page. No need to calculate - we show you exactly how much time you have left!

### Tip 2: Plan Your Final Recordings
When you see you have less than 5 minutes remaining, consider recording shorter sentences to maximize your contribution.

### Tip 3: Don't Worry About Going Slightly Over
If you have 30 seconds left and record a 35-second clip, the system will let you know and you can record a shorter one instead.

### Tip 4: Your Progress Saves
Even if you close the browser, your progress is saved. Come back anytime and pick up where you left off!

---

## 📱 Mobile Display

On mobile devices, the progress indicator is slightly more compact:

```
┌─────────────────────────────┐
│  Progress                    │
│  current: 3  total: 45       │
├─────────────────────────────┤
│  Session: ████░░░  3/10      │
├─────────────────────────────┤
│  ⏱️ Time Target               │
│  45:30 / 60:00               │
│  ████████████████░░░  75.8%  │
│  15 min left                 │
└─────────────────────────────┘
```

Everything still works the same, just optimized for smaller screens!

---

## ❓ FAQs

### Q: What if I want to record more than 60 minutes?
**A:** The 60-minute target ensures fair contribution distribution. Once you reach it, you've made a significant contribution! If you'd like to contribute more, please contact an administrator.

### Q: Does the timer count while I'm thinking or re-recording?
**A:** No! Only submitted recordings count toward your 60-minute target. Feel free to re-record as many times as needed.

### Q: Can I see my exact time down to the second?
**A:** Yes! The progress bar shows minutes and seconds (e.g., "45:30 / 60:00").

### Q: What happens if I lose internet connection?
**A:** Your progress is saved in the database. When you reconnect and refresh, you'll see your accurate progress.

### Q: Will I get a notification when I'm close to 60 minutes?
**A:** The progress bar changes to yellow/orange when you reach 45 minutes as a visual reminder. The "minutes remaining" counter also updates after each recording.

---

## 🛡️ Security Note

**The 60-minute limit is enforced at the server level.**

This means:
- ✅ Cannot be bypassed by modifying browser code
- ✅ Cannot be bypassed via direct API calls
- ✅ Works even if JavaScript is modified
- ✅ Protects against malicious users

You can trust that the progress bar is accurate and the limit is real!

---

## 🎓 Technical Details (For Developers)

### How It Works:
1. **Frontend**: Progress bar fetches total recording time from database
2. **Backend**: Validates every recording submission against the limit
3. **Database**: Stores accurate duration for each recording
4. **Calculation**: Sums all recording durations in real-time

### Update Frequency:
- Progress bar updates after each recording submission
- Stats refresh when you visit the page
- Real-time accuracy within 1 second

---

## 📊 Statistics

### What Counts Toward Your 60 Minutes:
- ✅ All submitted recordings (pending, approved, or rejected)
- ✅ Audio duration only (not silence before/after)
- ✅ Recordings from today and previous days

### What Doesn't Count:
- ❌ Recordings you started but didn't submit
- ❌ Time spent reading sentences
- ❌ Time spent navigating the app
- ❌ Deleted or failed recordings

---

## 🏆 Achievement Unlocked!

When you complete 60 minutes, you'll be among the top contributors to the Luo language dataset. Your voice recordings will help:

- 🎤 Train speech recognition systems
- 🌍 Preserve the Luo language digitally
- 👥 Help future generations access technology in their native language
- 🤖 Improve AI understanding of diverse languages

**Thank you for being part of this important work!**

---

*Need help? Visit the Dashboard or contact an administrator.*

