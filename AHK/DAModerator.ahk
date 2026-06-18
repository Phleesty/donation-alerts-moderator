#NoEnv
#SingleInstance Force
SetTitleMatchMode, 2 ; Позволяет искать окна по частичному совпадению заголовка (нужно для мультибраузерности)

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
DefaultChromePath := "" ; По умолчанию путь пустой (будет использоваться браузер по умолчанию)

if !FileExist(ConfigFile) {
    Gosub, ResetSettings
} else {
    IniRead, UserBind1, %ConfigFile%, Settings, UserBind1
    IniRead, MouseBind1, %ConfigFile%, Settings, MouseBind1
    IniRead, UserBind2, %ConfigFile%, Settings, UserBind2
    IniRead, MouseBind2, %ConfigFile%, Settings, MouseBind2
    IniRead, URL, %ConfigFile%, Settings, URL
    IniRead, ChromePath, %ConfigFile%, Settings, ChromePath

    ; Если ссылка не указана, открываем настройки
    if (URL = "") {
        Gosub, ShowGui
    } else {
        ; Если указан конкретный путь к браузеру, открываем в нем. Иначе в браузере по умолчанию.
        if (ChromePath != "" && FileExist(ChromePath)) {
            Run, "%ChromePath%" --new-window "%URL%"
        } else {
            Run, %URL%
        }
        Gosub, SetHotkeys
    }
}

return

ShowGui:
    ; Отключаем только те горячие клавиши, которые были назначены
    SafeHotkey(UserBind1, "AutoAccept", "Off")
    SafeHotkey(MouseBind1, "AutoAccept", "Off")
    SafeHotkey(UserBind2, "AutoSkip", "Off")
    SafeHotkey(MouseBind2, "AutoSkip", "Off")

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
    Gui, Add, Edit, x+1 vURL y80 w280 HwndhURL,
    Gui, Add, Text, x10 y113 w160, Путь до браузера:
    Gui, Add, Edit, x+1 vChromePath y110 w222 HwndhChromePath,
    Gui, Add, Button, gBrowseChrome x+10 y109 w50, Обзор
    Gui, Add, Button, gResetSettings x214 y+15 w140, Сбросить настройки
    Gui, Add, Button, Default gSubmit x+10 w90, Сохранить
    Gui, Show, w465 h180, DA Moderator - Настройки

    ; Устанавливаем плейсхолдер "по умолчанию" для поля выбора пути браузера
    PlaceholderPath := "по умолчанию"
    SendMessage, 0x1501, 1, &PlaceholderPath, , ahk_id %hChromePath%

    ; Устанавливаем плейсхолдер с примером ссылки для поля URL
    PlaceholderURL := "https://www.donationalerts.com/widget/lastdonations?alert_type=..."
    SendMessage, 0x1501, 1, &PlaceholderURL, , ahk_id %hURL%

    ; Устанавливаем text в элементы управления Edit после их создания
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
    SafeHotkey(UserBind1, "AutoAccept", "On")
    SafeHotkey(MouseBind1, "AutoAccept", "On")
    SafeHotkey(UserBind2, "AutoSkip", "On")
    SafeHotkey(MouseBind2, "AutoSkip", "On")
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
    IfWinExist, Last alerts - DonationAlerts
    {
        WinActivate, Last alerts - DonationAlerts
        WinWaitActive, Last alerts - DonationAlerts, , 2
        if !ErrorLevel {
            Send, ^+{NumpadDiv}
        }
        WinActivate, ahk_id %activeWindow%
    }
return

AutoSkip:
    WinGet, activeWindow, ID, A
    IfWinExist, Last alerts - DonationAlerts
    {
        WinActivate, Last alerts - DonationAlerts
        WinWaitActive, Last alerts - DonationAlerts, , 2
        if !ErrorLevel {
            Send, ^+{NumpadMult}
        }
        WinActivate, ahk_id %activeWindow%
    }
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

; Безопасная установка горячих клавиш с перехватом ошибок (например, невалидные имена клавиш при русской раскладке)
SafeHotkey(KeyName, LabelName, Options) {
    if (KeyName = "")
        return
    try {
        Hotkey, %KeyName%, %LabelName%, %Options%
    }
}
