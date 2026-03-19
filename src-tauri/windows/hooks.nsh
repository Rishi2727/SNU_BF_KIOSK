; Custom NSIS hooks for SNU BF KIOSK installer
; Tauri calls these macros at specific points during install/uninstall.

; Runs AFTER Tauri has copied files, set registry keys, and created shortcuts.
; Used here to add the extra registry entries from our original nsis-script.nsi.
!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$(^Name)" \
    "URLInfoAbout" "http://www.wiseneoscoindia.com"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$(^Name)" \
    "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$(^Name)" \
    "NoRepair" 1
!macroend

; Runs AFTER Tauri has removed files, registry keys, and shortcuts.
!macro NSIS_HOOK_POSTUNINSTALL
  ; Nothing extra needed — Tauri already removes its own registry entries.
!macroend
