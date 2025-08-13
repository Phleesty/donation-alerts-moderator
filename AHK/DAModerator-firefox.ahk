#NoEnv
#SingleInstance Force

; === Путь к конфигу ===
ConfigDir  := A_AppData "\DA Moderator"
ConfigFile := ConfigDir "\config-firefox.ini"

if !FileExist(ConfigDir)
    FileCreateDir, %ConfigDir%

Menu, Tray, Click, 1
Menu, Tray, NoStandard
Menu, Tray, Add, Изменить настройки, ShowGui
Menu, Tray, Add, Выход, ExitApp
Menu, Tray, Default, Изменить настройки

; === Значения по умолчанию ===
DefaultUserBind1   := "!a"
DefaultMouseBind1  := "XButton2"
DefaultUserBind2   := "!s"
DefaultMouseBind2  := ""
DefaultURL         := ""
DefaultBrowserPath := "C:\Program Files\Mozilla Firefox\firefox.exe"
DefaultWindowTitle := "Last alerts - DonationAlerts"

; --- Старт ---
if !FileExist(ConfigFile) {
    Gosub, ResetSettings
} else {
    Gosub, LoadSettings
    if (BrowserPath = "" || !FileExist(BrowserPath)) {
        BrowserPath := DefaultBrowserPath
        if !FileExist(BrowserPath) {
            MsgBox, 48, Не найден браузер, Укажите путь в настройках.
            Gosub, ShowGui
            return
        }
    }
    if (URL != "")
        Run, % """" BrowserPath """ -new-window """ URL """"
    Gosub, SetHotkeys
}
return

; --- Загрузка из INI ---
LoadSettings:
    IniRead, UserBind1,   %ConfigFile%, Settings, UserBind1
    IniRead, MouseBind1,  %ConfigFile%, Settings, MouseBind1
    IniRead, UserBind2,   %ConfigFile%, Settings, UserBind2
    IniRead, MouseBind2,  %ConfigFile%, Settings, MouseBind2
    IniRead, URL,         %ConfigFile%, Settings, URL
    IniRead, BrowserPath, %ConfigFile%, Settings, BrowserPath
    IniRead, WindowTitle, %ConfigFile%, Settings, WindowTitle
return

; --- Определение имени процесса ---
GetProcName(fullPath) {
    SplitPath, fullPath, , , , outNameNoExt
    return outNameNoExt ".exe"
}

; --- Окно настроек ---
ShowGui:
    if (UserBind1 != "")
        Hotkey, %UserBind1%, AutoAccept, Off
    if (MouseBind1 != "")
        Hotkey, %MouseBind1%, AutoAccept, Off
    if (UserBind2 != "")
        Hotkey, %UserBind2%, AutoSkip, Off
    if (MouseBind2 != "")
        Hotkey, %MouseBind2%, AutoSkip, Off

    Gui, Destroy
    Gui, +AlwaysOnTop

    Gui, Add, Text, x10 y13 w160, Автопринятие алерта:
    Gui, Add, Hotkey, x+1 vUserBind1 y10 w100
    Gui, Add, Text, x+10 y13, или
    Gui, Add, ComboBox, x+10 vMouseBind1 y10 w100, Нет|XButton1|XButton2

    Gui, Add, Text, x10 y48 w160, Автопропуск алерта:
    Gui, Add, Hotkey, x+1 vUserBind2 y45 w100
    Gui, Add, Text, x+10 y48, или
    Gui, Add, ComboBox, x+10 vMouseBind2 y45 w100, Нет|XButton1|XButton2

    Gui, Add, Text, x10 y83 w160, Ссылка для открытия:
    Gui, Add, Edit, x+1 vURL y80 w280

    Gui, Add, Text, x10 y113 w160, Путь до браузера:
    Gui, Add, Edit, x+1 vBrowserPath y110 w222
    Gui, Add, Button, gBrowseBrowser x+10 y109 w50, Обзор

    Gui, Add, Button, gResetSettings x214 y+15 w140, Сбросить настройки
    Gui, Add, Button, Default gSubmit x+10 w90, Сохранить

    ; Подставляем значения после создания (размеры не меняются)
    GuiControl,, UserBind1, %UserBind1%
    GuiControl,, UserBind2, %UserBind2%
    GuiControl,, URL, %URL%
    GuiControl,, BrowserPath, %BrowserPath%
    GuiControl,, WindowTitle, %WindowTitle%

    ; Выбираем значение в ComboBox из списка (без добавления дублей)
    GuiControl, ChooseString, MouseBind1, % (MouseBind1 = "" ? "Нет" : MouseBind1)
    GuiControl, ChooseString, MouseBind2, % (MouseBind2 = "" ? "Нет" : MouseBind2)

    Gui, Show, w465 h180, DA Moderator - Настройки
return

; --- Сохранение ---
Submit:
    Gui, Submit, Hide
    ; "Нет" → пусто в INI
    if (MouseBind1 = "Нет")
        MouseBind1 := ""
    if (MouseBind2 = "Нет")
        MouseBind2 := ""

    IniWrite, %UserBind1%,   %ConfigFile%, Settings, UserBind1
    IniWrite, %MouseBind1%,  %ConfigFile%, Settings, MouseBind1
    IniWrite, %UserBind2%,   %ConfigFile%, Settings, UserBind2
    IniWrite, %MouseBind2%,  %ConfigFile%, Settings, MouseBind2
    IniWrite, %URL%,         %ConfigFile%, Settings, URL
    IniWrite, %BrowserPath%, %ConfigFile%, Settings, BrowserPath
    IniWrite, %WindowTitle%, %ConfigFile%, Settings, WindowTitle

    Gosub, SetHotkeys
return

; --- Установка хоткеев ---
SetHotkeys:
    ; Превращаем "Нет" в пустое значение
    if (MouseBind1 = "Нет")
        MouseBind1 := ""
    if (MouseBind2 = "Нет")
        MouseBind2 := ""

    if (UserBind1 != "")
        Hotkey, %UserBind1%, AutoAccept, On
    if (MouseBind1 != "")
        Hotkey, %MouseBind1%, AutoAccept, On
    if (UserBind2 != "")
        Hotkey, %UserBind2%, AutoSkip, On
    if (MouseBind2 != "")
        Hotkey, %MouseBind2%, AutoSkip, On
return

; --- Выбор браузера ---
BrowseBrowser:
    FileSelectFile, SelectedPath, , , Выберите firefox.exe, EXE-файлы (*.exe)
    if (SelectedPath != "")
        GuiControl,, BrowserPath, %SelectedPath%
return

; --- Сброс настроек ---
ResetSettings:
    UserBind1   := DefaultUserBind1
    MouseBind1  := DefaultMouseBind1
    UserBind2   := DefaultUserBind2
    MouseBind2  := DefaultMouseBind2
    URL         := DefaultURL
    BrowserPath := DefaultBrowserPath
    WindowTitle := DefaultWindowTitle

    IniWrite, %UserBind1%,   %ConfigFile%, Settings, UserBind1
    IniWrite, %MouseBind1%,  %ConfigFile%, Settings, MouseBind1
    IniWrite, %UserBind2%,   %ConfigFile%, Settings, UserBind2
    IniWrite, %MouseBind2%,  %ConfigFile%, Settings, MouseBind2
    IniWrite, %URL%,         %ConfigFile%, Settings, URL
    IniWrite, %BrowserPath%, %ConfigFile%, Settings, BrowserPath
    IniWrite, %WindowTitle%, %ConfigFile%, Settings, WindowTitle

    Gosub, ShowGui
return

; --- Действия ---
AutoAccept:
    ProcName := GetProcName(BrowserPath)
    WinGet, activeWindow, ID, A
    WinActivate, %WindowTitle% ahk_exe %ProcName%
    WinWaitActive, %WindowTitle% ahk_exe %ProcName%
    Send, ^+{NumpadDiv}
    WinActivate, ahk_id %activeWindow%
return

AutoSkip:
    ProcName := GetProcName(BrowserPath)
    WinGet, activeWindow, ID, A
    WinActivate, %WindowTitle% ahk_exe %ProcName%
    WinWaitActive, %WindowTitle% ahk_exe %ProcName%
    Send, ^+{NumpadMult}
    WinActivate, ahk_id %activeWindow%
return

; --- Выход ---
ExitApp:
    ExitApp
return

; --- Закрытие окна настроек ---
GuiClose:
    Gui, Hide
    Gosub, LoadSettings
    Gosub, SetHotkeys
return
