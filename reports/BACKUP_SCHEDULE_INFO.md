# 📅 JSON Backup Schedule - Complete Guide

## 🔄 **Updated: Now Has Automatic Backups**

I've just added **automatic scheduled backups** to your system. Here's the complete backup schedule:

### **⏰ Automatic Daily Backups**
- **When**: Every day at **2:00 AM**
- **What**: Full export of all your lab data to JSON format
- **Where**: Timestamped backup files (e.g., `odysseus-backup-2025-09-09T02-00-00.json`)
- **Retention**: **7 days** of backups kept automatically (older ones deleted)

### **🔧 Manual Backups (Available Anytime)**
- **Admin Panel**: Create backup button
- **API Endpoints**: For technical users
- **Before Restore**: Automatic safety backup before any data restore operation
- **Database Switch**: Automatic backup when changing database types

## 📂 **Backup File Locations**

### **Development Mode:**
```
C:\Users\evan\Desktop\Odysseus\odysseus-app\server\data\
├── odysseus.json                           # Main data file
├── odysseus-backup-2025-09-09T02-00-00.json  # Daily backup
├── odysseus-backup-2025-09-08T02-00-00.json  # Previous day
└── [6 more daily backups...]               # Up to 7 days total
```

### **Production Mode:**
```
%APPDATA%\Odysseus\
├── odysseus-data.json                      # Main data file  
├── odysseus-backup-2025-09-09T02-00-00.json  # Daily backup
└── [up to 7 daily backups...]
```

## 🛡️ **Safety Features**

### **Automatic Cleanup**
- Keeps **7 most recent backups**
- Deletes older backups automatically
- Prevents disk space from filling up
- Logs all cleanup actions

### **Error Handling**
- If backup fails, tries again next day
- Doesn't stop the main app if backup has issues
- Logs all backup attempts for troubleshooting

### **Smart Scheduling**
- Calculates exact time until next 2:00 AM
- Reschedules automatically after each backup
- Handles system restarts gracefully

## ⚙️ **Backup Configuration Options**

You can customize the backup schedule by modifying these settings:

### **Change Backup Time**
Currently set to **2:00 AM** - ideal because:
- Lab is typically closed
- Minimal system usage
- Won't interfere with daily work

### **Change Retention Period**
Currently keeps **7 days** of backups:
- Covers a full week of data
- Allows recovery from recent issues
- Balances safety with disk space

### **Manual Control**
Admins can also:
- ✅ Create immediate backup anytime
- ✅ Export specific data sets
- ✅ Stop/start scheduled backups
- ✅ Download backup files

## 📊 **What Gets Backed Up**

Each backup contains **complete lab data**:
- 🧪 **All tube records** (samples, locations, metadata)
- 👥 **Researcher information** (who owns what samples)
- 🔐 **User accounts** (login credentials, permissions)
- 📋 **Configuration settings** (app preferences)
- ⏰ **Backup metadata** (when created, version info)

## 🔍 **Monitoring Backups**

### **Success Indicators**
- ✅ Console logs: "Scheduled backup completed successfully"
- ✅ New timestamped files appear in data directory
- ✅ Old backups cleaned up automatically

### **Failure Alerts**
- ❌ Console logs: "Scheduled backup failed"
- ❌ No new backup files created
- ❌ Error details logged for troubleshooting

## 💡 **Best Practices**

### **For Lab Managers**
- **Check backup logs** occasionally to ensure they're working
- **Test restore procedure** periodically (maybe quarterly)
- **Keep external backups** for critical research data (USB drives, cloud storage)

### **For IT/Technical Users**
- **Monitor disk space** where backups are stored
- **Review backup logs** in server console or log files
- **Test disaster recovery** procedures before you need them

## 🚨 **Emergency Procedures**

### **If Main Database Fails**
1. **Latest backup location**: Check data directory for most recent `odysseus-backup-*.json`
2. **Restore command**: Use admin restore endpoint with backup file path
3. **Verify data**: Check that all recent samples are present

### **If Backups Stop Working**
1. **Check logs**: Look for error messages in server console
2. **Check disk space**: Ensure sufficient storage available  
3. **Restart service**: Sometimes fixes temporary issues
4. **Manual backup**: Create immediate backup to ensure data safety

## ✅ **Summary**

Your lab data is now protected with:
- 🔄 **Daily automatic backups** at 2:00 AM
- 🗂️ **7 days of backup history** for recovery options
- 🛡️ **Automatic cleanup** to manage disk space
- 🔧 **Manual backup options** for immediate needs
- 📊 **Complete data coverage** including all samples and settings

The system runs automatically and requires no daily management, giving you peace of mind that your valuable lab data is always protected.
