#NoEnv
#SingleInstance Force

; Определяем путь к папке для хранения конфигурационного файла
ConfigDir := A_AppData "\DA Moderator"
ConfigFile := ConfigDir "\config.ini"

; Создаем папку, если она не существует
if !FileExist(ConfigDir)
    FileCreateDir, %ConfigDir%

Menu, Tray, Click, 1
Menu, Tray, NoStandard
Menu, Tray, Add, Изменить настройки, ShowGui
Menu, Tray, Add, Выход, ExitApp
Menu, Tray, Default, Изменить настройки

DefaultUserBind1 := "!a"
DefaultMouseBind1 := "XButton2"
DefaultUserBind2 := "!s"
DefaultMouseBind2 := ""
DefaultURL := ""
DefaultChromePath := "C:\Program Files\Google\Chrome\Application\chrome.exe"

if !FileExist(ConfigFile) {
    Gosub, ResetSettings
} else {
    IniRead, UserBind1, %ConfigFile%, Settings, UserBind1
    IniRead, MouseBind1, %ConfigFile%, Settings, MouseBind1
    IniRead, UserBind2, %ConfigFile%, Settings, UserBind2
    IniRead, MouseBind2, %ConfigFile%, Settings, MouseBind2
    IniRead, URL, %ConfigFile%, Settings, URL
    IniRead, ChromePath, %ConfigFile%, Settings, ChromePath

    ; Если ссылка указана, открываем её в указанном Google Chrome
    if (URL != "")
        Run, "%ChromePath%" --new-window "%URL%"

    Gosub, SetHotkeys
}

return

ShowGui:
    ; Отключаем только те горячие клавиши, которые были назначены
    if (UserBind1 != "")
        Hotkey, %UserBind1%, AutoAccept, Off
    if (MouseBind1 != "")
        Hotkey, %MouseBind1%, AutoAccept, Off
    if (UserBind2 != "")
        Hotkey, %UserBind2%, AutoSkip, Off
    if (MouseBind2 != "")
        Hotkey, %MouseBind2%, AutoSkip, Off

    ; Создание GUI
    Gui, Destroy
    Gui, Add, Text, x10 y13 w160, Автопринятие алерта:
    Gui, Add, Hotkey, x+1 vUserBind1 y10 w100, %UserBind1%
    Gui, Add, Text, x+10 y13, или
    Gui, Add, ComboBox, x+10 vMouseBind1 y10 w100, Нет|XButton1|XButton2
    GuiControl, ChooseString, MouseBind1, % (MouseBind1 = "" ? "Нет" : MouseBind1)
    Gui, Add, Text, x10 y48 w160, Автопропуск алерта:
    Gui, Add, Hotkey, x+1 vUserBind2 y45 w100, %UserBind2%
    Gui, Add, Text, x+10 y48, или
    Gui, Add, ComboBox, x+10 vMouseBind2 y45 w100, Нет|XButton1|XButton2
    GuiControl, ChooseString, MouseBind2, % (MouseBind2 = "" ? "Нет" : MouseBind2)
    Gui, Add, Text, x10 y83 w160, Ссылка для открытия:
    Gui, Add, Edit, x+1 vURL y80 w280,
    Gui, Add, Text, x10 y113 w160, Путь до Google Chrome:
    Gui, Add, Edit, x+1 vChromePath y110 w222,
    Gui, Add, Button, gBrowseChrome x+10 y109 w50, Обзор
    Gui, Add, Button, gResetSettings x214 y+15 w140, Сбросить настройки
    Gui, Add, Button, Default gSubmit x+10 w90, Сохранить
    Gui, Show, w465 h180, DA Moderator - Настройки

    ; Устанавливаем текст в элементы управления Edit после их создания
    GuiControl,, URL, %URL%
    GuiControl,, ChromePath, %ChromePath%
return

Submit:
    Gui, Submit, Hide
    ; Если выбрано "Нет", сохраняем пустое значение
    MouseBind1 := (MouseBind1 = "Нет" ? "" : MouseBind1)
    MouseBind2 := (MouseBind2 = "Нет" ? "" : MouseBind2)
    IniWrite, %UserBind1%, %ConfigFile%, Settings, UserBind1
    IniWrite, %MouseBind1%, %ConfigFile%, Settings, MouseBind1
    IniWrite, %UserBind2%, %ConfigFile%, Settings, UserBind2
    IniWrite, %MouseBind2%, %ConfigFile%, Settings, MouseBind2
    IniWrite, %URL%, %ConfigFile%, Settings, URL
    IniWrite, %ChromePath%, %ConfigFile%, Settings, ChromePath

    ; Активируем горячие клавиши
    Gosub, SetHotkeys
return

SetHotkeys:
    ; Назначаем только те горячие клавиши, которые заданы
    if (UserBind1 != "")
        Hotkey, %UserBind1%, AutoAccept, On
    if (MouseBind1 != "")
        Hotkey, %MouseBind1%, AutoAccept, On
    if (UserBind2 != "")
        Hotkey, %UserBind2%, AutoSkip, On
    if (MouseBind2 != "")
        Hotkey, %MouseBind2%, AutoSkip, On
return

BrowseChrome:
    FileSelectFile, SelectedPath, , , Выберите chrome.exe, EXE-файлы (*.exe)
    if (SelectedPath != "")
        GuiControl,, ChromePath, %SelectedPath%
return

ResetSettings:
    ; Устанавливаем настройки по умолчанию
    UserBind1 := DefaultUserBind1
    MouseBind1 := DefaultMouseBind1
    UserBind2 := DefaultUserBind2
    MouseBind2 := DefaultMouseBind2
    URL := DefaultURL
    ChromePath := DefaultChromePath

    ; Сохраняем настройки по умолчанию в config.ini
    IniWrite, %UserBind1%, %ConfigFile%, Settings, UserBind1
    IniWrite, %MouseBind1%, %ConfigFile%, Settings, MouseBind1
    IniWrite, %UserBind2%, %ConfigFile%, Settings, UserBind2
    IniWrite, %MouseBind2%, %ConfigFile%, Settings, MouseBind2
    IniWrite, %URL%, %ConfigFile%, Settings, URL
    IniWrite, %ChromePath%, %ConfigFile%, Settings, ChromePath

    ; Перезапускаем GUI с новыми значениями
    Gosub, ShowGui
return

AutoAccept:
    WinGet, activeWindow, ID, A
    WinActivate, Last alerts - DonationAlerts - Google Chrome
    WinWaitActive, Last alerts - DonationAlerts - Google Chrome
    Send, ^+{NumpadDiv}
    WinActivate, ahk_id %activeWindow%
return

AutoSkip:
    WinGet, activeWindow, ID, A
    WinActivate, Last alerts - DonationAlerts - Google Chrome
    WinWaitActive, Last alerts - DonationAlerts - Google Chrome
    Send, ^+{NumpadMult}
    WinActivate, ahk_id %activeWindow%
return

ExitApp:
    ExitApp
return

GuiClose:
    Gui, Hide
    ; Восстанавливаем значения из файла config.ini
    IniRead, UserBind1, %ConfigFile%, Settings, UserBind1
    IniRead, MouseBind1, %ConfigFile%, Settings, MouseBind1
    IniRead, UserBind2, %ConfigFile%, Settings, UserBind2
    IniRead, MouseBind2, %ConfigFile%, Settings, MouseBind2
    IniRead, URL, %ConfigFile%, Settings, URL
    IniRead, ChromePath, %ConfigFile%, Settings, ChromePath

    ; Активируем горячие клавиши
    Gosub, SetHotkeys
return
