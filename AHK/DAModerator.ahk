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
DefaultURL2 := ""
DefaultOpenNewWindow := 1
DefaultChromePath := "" ; По умолчанию путь пустой (будет использоваться браузер по умолчанию)
ChromeDefaultExe := "C:\Program Files\Google\Chrome\Application\chrome.exe" ; Стандартный путь к Chrome

GlobalHwnd1 := 0
GlobalHwnd2 := 0

if !FileExist(ConfigFile) {
    Gosub, ResetSettings
} else {
    IniRead, UserBind1, %ConfigFile%, Settings, UserBind1
    IniRead, MouseBind1, %ConfigFile%, Settings, MouseBind1
    IniRead, UserBind2, %ConfigFile%, Settings, UserBind2
    IniRead, MouseBind2, %ConfigFile%, Settings, MouseBind2
    IniRead, URL, %ConfigFile%, Settings, URL
    IniRead, URL2, %ConfigFile%, Settings, URL2, %A_Space%
    IniRead, OpenNewWindow, %ConfigFile%, Settings, OpenNewWindow, 1
    IniRead, ChromePath, %ConfigFile%, Settings, ChromePath

    ; Проверяем валидность первой ссылки (она должна начинаться с http:// или https://)
    IsValidURL := (SubStr(URL, 1, 7) = "http://" || SubStr(URL, 1, 8) = "https://")
    IsValidURL2 := (SubStr(URL2, 1, 7) = "http://" || SubStr(URL2, 1, 8) = "https://")

    ; Если ссылка не указана или невалидна, открываем настройки
    if (!IsValidURL) {
        URL := "" ; Очищаем невалидную ссылку для плейсхолдера
        Gosub, ShowGui
    } else {
        ; Определяем исполняемый файл браузера
        if (ChromePath != "" && FileExist(ChromePath)) {
            BrowserExe := ChromePath
        } else {
            BrowserExe := GetDefaultBrowserExe()
        }

        ; Запуск Окна 1 (DonationAlerts)
        OldList1 := GetTopWindowList()
        LaunchURL(URL, OpenNewWindow, BrowserExe)
        GlobalHwnd1 := WaitForNewWindow(OldList1, 3000)
        if (!GlobalHwnd1 && WinExist("Last alerts - DonationAlerts"))
            WinGet, GlobalHwnd1, ID, Last alerts - DonationAlerts

        if (GlobalHwnd1)
            ApplyWindowPosition(GlobalHwnd1, "Window1")

        ; Запуск Окна 2 (Дополнительная ссылка, если задана)
        if (IsValidURL2) {
            Sleep, 150 ; Короткая пауза для надежного создания второго отдельного окна
            OldList2 := GetTopWindowList()
            LaunchURL(URL2, OpenNewWindow, BrowserExe)
            GlobalHwnd2 := WaitForNewWindow(OldList2, 3000)
            if (GlobalHwnd2)
                ApplyWindowPosition(GlobalHwnd2, "Window2")
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

    Gui, Add, Text, x10 y118 w160, Дополнительная ссылка:
    Gui, Add, Edit, x+1 vURL2 y115 w280 HwndhURL2,

    Gui, Add, Text, x10 y153 w160, Путь до браузера:
    Gui, Add, Edit, x+1 vChromePath y150 w222 HwndhChromePath,
    Gui, Add, Button, gBrowseChrome x+10 y149 w50, Обзор

    Gui, Add, Text, x10 y188 w160 gToggleNewWindow, Открывать в новых окнах:
    Gui, Add, CheckBox, x+1 vOpenNewWindow y185 h21,
    Gui, Add, Button, gSaveWindowPos x214 y184 w240, Запомнить положение окон

    Gui, Add, Button, gResetSettings x214 y+15 w140, Сбросить настройки
    Gui, Add, Button, Default gSubmit x+10 w90, Сохранить
    Gui, Show, w465 h255, DA Moderator - Настройки

    ; Устанавливаем плейсхолдер "по умолчанию"
    PlaceholderPath := "по умолчанию"
    SendMessage, 0x1501, 0, &PlaceholderPath, , ahk_id %hChromePath%

    ; Устанавливаем плейсхолдер для первой ссылки
    PlaceholderURL := "https://www.donationalerts.com/widget/lastdonations?alert_type=..."
    SendMessage, 0x1501, 0, &PlaceholderURL, , ahk_id %hURL%

    ; Устанавливаем плейсхолдер для второй ссылки
    PlaceholderURL2 := "https://twitch.tv/channel"
    SendMessage, 0x1501, 0, &PlaceholderURL2, , ahk_id %hURL2%

    ; Устанавливаем текст и состояние в элементы управления после их создания
    GuiControl,, URL, %URL%
    GuiControl,, URL2, %URL2%
    GuiControl,, OpenNewWindow, %OpenNewWindow%
    GuiControl,, ChromePath, %ChromePath%
return

ToggleNewWindow:
    GuiControlGet, CurrentState,, OpenNewWindow
    GuiControl,, OpenNewWindow, % !CurrentState
return

Submit:
    Gui, Submit, NoHide ; Считываем данные без закрытия GUI для валидации
    
    ; Валидация ссылки 1 (если она не пустая)
    if (URL != "" && !(SubStr(URL, 1, 7) = "http://" || SubStr(URL, 1, 8) = "https://")) {
        MsgBox, 48, Ошибка, Ссылка для открытия должна начинаться с https:// или http://
        return
    }

    ; Валидация ссылки 2 (если она не пустая)
    if (URL2 != "" && !(SubStr(URL2, 1, 7) = "http://" || SubStr(URL2, 1, 8) = "https://")) {
        MsgBox, 48, Ошибка, Дополнительная ссылка должна начинаться с https:// или http://
        return
    }
    
    Gui, Hide
    ; Если выбрано "Нет", сохраняем пустое значение
    MouseBind1 := (MouseBind1 = "Нет" ? "" : MouseBind1)
    MouseBind2 := (MouseBind2 = "Нет" ? "" : MouseBind2)
    IniWrite, %UserBind1%, %ConfigFile%, Settings, UserBind1
    IniWrite, %MouseBind1%, %ConfigFile%, Settings, MouseBind1
    IniWrite, %UserBind2%, %ConfigFile%, Settings, UserBind2
    IniWrite, %MouseBind2%, %ConfigFile%, Settings, MouseBind2
    IniWrite, %URL%, %ConfigFile%, Settings, URL
    IniWrite, %URL2%, %ConfigFile%, Settings, URL2
    IniWrite, %OpenNewWindow%, %ConfigFile%, Settings, OpenNewWindow
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
    URL2 := DefaultURL2
    OpenNewWindow := DefaultOpenNewWindow
    ChromePath := DefaultChromePath

    ; Сохраняем настройки по умолчанию в config.ini
    IniWrite, %UserBind1%, %ConfigFile%, Settings, UserBind1
    IniWrite, %MouseBind1%, %ConfigFile%, Settings, MouseBind1
    IniWrite, %UserBind2%, %ConfigFile%, Settings, UserBind2
    IniWrite, %MouseBind2%, %ConfigFile%, Settings, MouseBind2
    IniWrite, %URL%, %ConfigFile%, Settings, URL
    IniWrite, %URL2%, %ConfigFile%, Settings, URL2
    IniWrite, %OpenNewWindow%, %ConfigFile%, Settings, OpenNewWindow
    IniWrite, %ChromePath%, %ConfigFile%, Settings, ChromePath

    ; Сбрасываем сохраненные положения окон
    IniDelete, %ConfigFile%, Window1
    IniDelete, %ConfigFile%, Window2
    IniDelete, %ConfigFile%, Window

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
    IniRead, URL2, %ConfigFile%, Settings, URL2, %A_Space%
    IniRead, OpenNewWindow, %ConfigFile%, Settings, OpenNewWindow, 1
    IniRead, ChromePath, %ConfigFile%, Settings, ChromePath

    ; Активируем горячие клавиши
    Gosub, SetHotkeys
return

; Сохранение текущего положения и размера окон виджета и второй ссылки
SaveWindowPos:
    SavedCount := 0
    SavedInfo := ""

    ; 1. Проверяем Окно 1 (DonationAlerts)
    h1 := 0
    if (GlobalHwnd1 && WinExist("ahk_id " GlobalHwnd1)) {
        h1 := GlobalHwnd1
    } else if WinExist("Last alerts - DonationAlerts") {
        WinGet, h1, ID, Last alerts - DonationAlerts
    }

    if (h1) {
        info1 := SaveSingleWindowPos(h1, "Window1")
        SavedCount++
        SavedInfo .= "Окно 1 (DonationAlerts): " info1 "`n"
    }

    ; 2. Проверяем Окно 2 (Дополнительная ссылка)
    if (GlobalHwnd2 && WinExist("ahk_id " GlobalHwnd2)) {
        info2 := SaveSingleWindowPos(GlobalHwnd2, "Window2")
        SavedCount++
        SavedInfo .= "Окно 2 (Дополнительное): " info2 "`n"
    }

    if (SavedCount > 0) {
        MsgBox, 64, Успешно, Сохранено окон: %SavedCount%`n`n%SavedInfo%
    } else {
        MsgBox, 48, Окна не найдены, Открытые окна виджета или дополнительной ссылки не найдены.`nЗапустите их через DAModerator и настройте их положение на экране.
    }
return

; Сохранение параметров отдельного окна в заданную секцию config.ini
SaveSingleWindowPos(hWnd, sectionName) {
    global ConfigFile
    WinGetPos, WinX, WinY, WinW, WinH, ahk_id %hWnd%

    ; Определяем монитор и рабочую область (без панели задач)
    CenterX := WinX + WinW / 2
    CenterY := WinY + WinH / 2
    SysGet, MonCount, MonitorCount
    TargetMon := 1
    Loop, %MonCount% {
        SysGet, MonWA, MonitorWorkArea, %A_Index%
        if (CenterX >= MonWALeft && CenterX <= MonWARight && CenterY >= MonWATop && CenterY <= MonWABottom) {
            TargetMon := A_Index
            break
        }
    }
    SysGet, MonWA, MonitorWorkArea, %TargetMon%
    WorkLeft := MonWALeft
    WorkTop := MonWATop
    WorkRight := MonWARight
    WorkBottom := MonWABottom
    WorkWidth := WorkRight - WorkLeft
    WorkHeight := WorkBottom - WorkTop

    ; Анализируем, прикреплено ли окно через Windows Snap
    Tolerance := 25
    IsFullHeight := (Abs(WinY - WorkTop) <= Tolerance) && (Abs((WinY + WinH) - WorkBottom) <= Tolerance)
    IsRightEdge := (Abs((WinX + WinW) - WorkRight) <= Tolerance)
    IsLeftEdge := (Abs(WinX - WorkLeft) <= Tolerance)
    IsHalfWidth := (Abs(WinW - WorkWidth / 2) <= 40)

    if (IsFullHeight && IsRightEdge && IsHalfWidth) {
        SnapMode := "RightHalf"
        ModeDesc := "Правая половина (Windows Snap)"
    } else if (IsFullHeight && IsLeftEdge && IsHalfWidth) {
        SnapMode := "LeftHalf"
        ModeDesc := "Левая половина (Windows Snap)"
    } else if (IsFullHeight && IsRightEdge) {
        SnapMode := "RightDock"
        ModeDesc := "Справа на всю высоту"
    } else if (IsFullHeight && IsLeftEdge) {
        SnapMode := "LeftDock"
        ModeDesc := "Слева на всю высоту"
    } else {
        SnapMode := "Custom"
        ModeDesc := "Пользовательское"
    }

    ; Сохраняем параметры в config.ini
    IniWrite, %WinX%, %ConfigFile%, %sectionName%, X
    IniWrite, %WinY%, %ConfigFile%, %sectionName%, Y
    IniWrite, %WinW%, %ConfigFile%, %sectionName%, Width
    IniWrite, %WinH%, %ConfigFile%, %sectionName%, Height
    IniWrite, %SnapMode%, %ConfigFile%, %sectionName%, SnapMode
    IniWrite, %TargetMon%, %ConfigFile%, %sectionName%, Monitor

    ; Для обратной совместимости с Window
    if (sectionName = "Window1") {
        IniWrite, %WinX%, %ConfigFile%, Window, X
        IniWrite, %WinY%, %ConfigFile%, Window, Y
        IniWrite, %WinW%, %ConfigFile%, Window, Width
        IniWrite, %WinH%, %ConfigFile%, Window, Height
        IniWrite, %SnapMode%, %ConfigFile%, Window, SnapMode
        IniWrite, %TargetMon%, %ConfigFile%, Window, Monitor
    }

    return ModeDesc " [X=" WinX ", Y=" WinY ", " WinW "x" WinH "]"
}

; Применение сохраненного положения и размера к окну по его HWND
ApplyWindowPosition(hWnd, sectionName) {
    global ConfigFile
    if (!hWnd || !WinExist("ahk_id " hWnd))
        return

    IniRead, WinX, %ConfigFile%, %sectionName%, X, %A_Space%
    ; Fallback на секцию Window для Window1 при миграции настроек
    if ((WinX = "" || WinX = "ERROR") && sectionName = "Window1") {
        IniRead, WinX, %ConfigFile%, Window, X, %A_Space%
        IniRead, WinY, %ConfigFile%, Window, Y, %A_Space%
        IniRead, WinW, %ConfigFile%, Window, Width, %A_Space%
        IniRead, WinH, %ConfigFile%, Window, Height, %A_Space%
        IniRead, SnapMode, %ConfigFile%, Window, SnapMode, Custom
        IniRead, TargetMon, %ConfigFile%, Window, Monitor, 1
    } else {
        IniRead, WinY, %ConfigFile%, %sectionName%, Y, %A_Space%
        IniRead, WinW, %ConfigFile%, %sectionName%, Width, %A_Space%
        IniRead, WinH, %ConfigFile%, %sectionName%, Height, %A_Space%
        IniRead, SnapMode, %ConfigFile%, %sectionName%, SnapMode, Custom
        IniRead, TargetMon, %ConfigFile%, %sectionName%, Monitor, 1
    }

    if (WinX != "" && WinX != "ERROR" && WinY != "" && WinY != "ERROR" && WinW != "" && WinW != "ERROR" && WinH != "" && WinH != "ERROR") {
        WinGet, minMax, MinMax, ahk_id %hWnd%
        if (minMax != 0)
            WinRestore, ahk_id %hWnd%

        SysGet, MonWA, MonitorWorkArea, %TargetMon%
        WorkLeft := MonWALeft
        WorkTop := MonWATop
        WorkRight := MonWARight
        WorkBottom := MonWABottom
        WorkWidth := WorkRight - WorkLeft
        WorkHeight := WorkBottom - WorkTop

        if (SnapMode = "RightHalf") {
            WinActivate, ahk_id %hWnd%
            Send, #{Right}
        } else if (SnapMode = "LeftHalf") {
            WinActivate, ahk_id %hWnd%
            Send, #{Left}
        } else if (SnapMode = "RightDock") {
            WinMove, ahk_id %hWnd%, , WorkRight - WinW, WorkTop, WinW, WorkHeight
        } else if (SnapMode = "LeftDock") {
            WinMove, ahk_id %hWnd%, , WorkLeft, WorkTop, WinW, WorkHeight
        } else {
            WinMove, ahk_id %hWnd%, , %WinX%, %WinY%, %WinW%, %WinH%
        }
    }
}

; Запуск ссылки в браузере с учетом настройки открытия в новом окне
LaunchURL(targetURL, openNewWindow, browserExe) {
    if (openNewWindow) {
        if (browserExe != "") {
            Run, "%browserExe%" --new-window "%targetURL%"
        } else {
            Run, %targetURL%
        }
    } else {
        if (browserExe != "") {
            Run, "%browserExe%" "%targetURL%"
        } else {
            Run, %targetURL%
        }
    }
}

; Получение ассоциативного массива существующих окон
GetTopWindowList() {
    WinGet, idList, List
    arr := {}
    Loop, %idList% {
        this_id := idList%A_Index%
        arr[this_id] := 1
    }
    return arr
}

; Ожидание появления нового видимого окна, которого не было в oldList
WaitForNewWindow(oldList, timeoutMs := 3000) {
    startTime := A_TickCount
    while (A_TickCount - startTime < timeoutMs) {
        WinGet, currentList, List
        Loop, %currentList% {
            this_id := currentList%A_Index%
            if (!oldList.HasKey(this_id)) {
                WinGet, style, Style, ahk_id %this_id%
                ; WS_VISIBLE = 0x10000000
                if (style & 0x10000000) {
                    return this_id
                }
            }
        }
        Sleep, 10
    }
    return 0
}

; Безопасная установка горячих клавиш с перехватом ошибок (например, невалидные имена клавиш при русской раскладке)
SafeHotkey(KeyName, LabelName, Options) {
    if (KeyName = "")
        return
    try {
        Hotkey, %KeyName%, %LabelName%, %Options%
    }
}

; Функция определения пути к исполняемому файлу браузера по умолчанию из реестра Windows
GetDefaultBrowserExe() {
    RegRead, ProgId, HKCU\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice, ProgId
    if (ProgId = "")
        RegRead, ProgId, HKCU\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice, ProgId
    if (ProgId != "") {
        RegRead, Cmd, HKCR\%ProgId%\shell\open\command
        if (Cmd != "") {
            if RegExMatch(Cmd, "i)""?([^""]+\.exe)""?", Match) {
                if FileExist(Match1)
                    return Match1
            }
        }
    }
    return ""
}