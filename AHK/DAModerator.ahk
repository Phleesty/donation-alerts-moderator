#NoEnv
#SingleInstance Force
SetTitleMatchMode, 2 ; Позволяет искать окна по частичному совпадению заголовка

; === Путь к конфигурационному файлу ===
ConfigDir := A_AppData "\DA Moderator"
ConfigFile := ConfigDir "\config.ini"

; Создаем папку для конфига, если она не существует
if !FileExist(ConfigDir)
    FileCreateDir, %ConfigDir%

; Настройка системного трея
Menu, Tray, Click, 1
Menu, Tray, NoStandard
Menu, Tray, Add, Изменить настройки, ShowGui
Menu, Tray, Add, Выход, ExitApp
Menu, Tray, Default, Изменить настройки

; === Значения по умолчанию ===
DefaultUserBind1 := "!a"       ; Alt + A для подтверждения
DefaultMouseBind1 := "XButton2" ; Боковая кнопка мыши 2
DefaultUserBind2 := "!s"       ; Alt + S для пропуска
DefaultMouseBind2 := ""
DefaultURL := ""
DefaultBrowserPath := ""       ; Если пусто — запускается системный браузер по умолчанию
DefaultWindowTitle := "Last alerts - DonationAlerts"

; Загрузка настроек при старте
if !FileExist(ConfigFile) {
    Gosub, ResetSettings
} else {
    Gosub, LoadSettings
    
    ; Открываем ссылку, если она указана
    if (URL != "") {
        if (BrowserPath != "" && FileExist(BrowserPath)) {
            Run, "%BrowserPath%" --new-window "%URL%"
        } else {
            ; Запуск в браузере по умолчанию
            Run, %URL%
        }
    }
    Gosub, SetHotkeys
}
return

; === Загрузка настроек ===
LoadSettings:
    IniRead, UserBind1, %ConfigFile%, Settings, UserBind1, %DefaultUserBind1%
    IniRead, MouseBind1, %ConfigFile%, Settings, MouseBind1, %DefaultMouseBind1%
    IniRead, UserBind2, %ConfigFile%, Settings, UserBind2, %DefaultUserBind2%
    IniRead, MouseBind2, %ConfigFile%, Settings, MouseBind2, %DefaultMouseBind2%
    IniRead, URL, %ConfigFile%, Settings, URL, %DefaultURL%
    IniRead, BrowserPath, %ConfigFile%, Settings, BrowserPath, %DefaultBrowserPath%
    IniRead, WindowTitle, %ConfigFile%, Settings, WindowTitle, %DefaultWindowTitle%
return

; === Окно настроек (GUI) ===
ShowGui:
    ; Отключаем хоткеи на время редактирования
    Gosub, DisableHotkeys

    Gui, Destroy
    Gui, +AlwaysOnTop
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
    Gui, Add, Edit, x+1 vURL y80 w280, %URL%

    Gui, Add, Text, x10 y113 w160, Путь до браузера (опционально):
    Gui, Add, Edit, x+1 vBrowserPath y110 w222, %BrowserPath%
    Gui, Add, Button, gBrowseBrowser x+10 y109 w50, Обзор

    Gui, Add, Text, x10 y143 w160, Заголовок окна виджета:
    Gui, Add, Edit, x+1 vWindowTitle y140 w280, %WindowTitle%

    Gui, Add, Button, gResetSettings x114 y175 w140, Сбросить настройки
    Gui, Add, Button, Default gSubmit x+10 w90, Сохранить
    Gui, Show, w465 h210, DA Moderator - Настройки
return

BrowseBrowser:
    FileSelectFile, SelectedPath, , , Выберите исполняемый файл браузера, EXE-файлы (*.exe)
    if (SelectedPath != "")
        GuiControl,, BrowserPath, %SelectedPath%
return

Submit:
    Gui, Submit, Hide
    MouseBind1 := (MouseBind1 = "Нет" ? "" : MouseBind1)
    MouseBind2 := (MouseBind2 = "Нет" ? "" : MouseBind2)
    
    IniWrite, %UserBind1%, %ConfigFile%, Settings, UserBind1
    IniWrite, %MouseBind1%, %ConfigFile%, Settings, MouseBind1
    IniWrite, %UserBind2%, %ConfigFile%, Settings, UserBind2
    IniWrite, %MouseBind2%, %ConfigFile%, Settings, MouseBind2
    IniWrite, %URL%, %ConfigFile%, Settings, URL
    IniWrite, %BrowserPath%, %ConfigFile%, Settings, BrowserPath
    IniWrite, %WindowTitle%, %ConfigFile%, Settings, WindowTitle

    Gosub, SetHotkeys
return

; === Установка горячих клавиш ===
SetHotkeys:
    if (UserBind1 != "")
        Hotkey, %UserBind1%, AutoAccept, On
    if (MouseBind1 != "")
        Hotkey, %MouseBind1%, AutoAccept, On
    if (UserBind2 != "")
        Hotkey, %UserBind2%, AutoSkip, On
    if (MouseBind2 != "")
        Hotkey, %MouseBind2%, AutoSkip, On
return

; === Отключение горячих клавиш ===
DisableHotkeys:
    if (UserBind1 != "")
        Hotkey, %UserBind1%, AutoAccept, Off
    if (MouseBind1 != "")
        Hotkey, %MouseBind1%, AutoAccept, Off
    if (UserBind2 != "")
        Hotkey, %UserBind2%, AutoSkip, Off
    if (MouseBind2 != "")
        Hotkey, %MouseBind2%, AutoSkip, Off
return

ResetSettings:
    UserBind1 := DefaultUserBind1
    MouseBind1 := DefaultMouseBind1
    UserBind2 := DefaultUserBind2
    MouseBind2 := DefaultMouseBind2
    URL := DefaultURL
    BrowserPath := DefaultBrowserPath
    WindowTitle := DefaultWindowTitle

    IniWrite, %UserBind1%, %ConfigFile%, Settings, UserBind1
    IniWrite, %MouseBind1%, %ConfigFile%, Settings, MouseBind1
    IniWrite, %UserBind2%, %ConfigFile%, Settings, UserBind2
    IniWrite, %MouseBind2%, %ConfigFile%, Settings, MouseBind2
    IniWrite, %URL%, %ConfigFile%, Settings, URL
    IniWrite, %BrowserPath%, %ConfigFile%, Settings, BrowserPath
    IniWrite, %WindowTitle%, %ConfigFile%, Settings, WindowTitle

    Gosub, ShowGui
return

; === Выполнение команд модерации ===
AutoAccept:
    Gosub, FindAndTriggerAlert
    if (WidgetActive) {
        Send, ^+{NumpadDiv} ; Отправляем сочетание клавиш для подтверждения
        Gosub, ReturnFocus
    }
return

AutoSkip:
    Gosub, FindAndTriggerAlert
    if (WidgetActive) {
        Send, ^+{NumpadMult} ; Отправляем сочетание клавиш для пропуска
        Gosub, ReturnFocus
    }
return

; Вспомогательный поиск окна виджета и передача фокуса
FindAndTriggerAlert:
    WidgetActive := false
    ; Проверяем, существует ли окно виджета
    IfWinExist, %WindowTitle%
    {
        ; Запоминаем текущее активное окно пользователя
        WinGet, activeWindow, ID, A
        
        ; Активируем окно виджета
        WinActivate, %WindowTitle%
        WinWaitActive, %WindowTitle%, , 2 ; Ждем активации не более 2 секунд
        
        if !ErrorLevel {
            WidgetActive := true
        }
    }
    else
    {
        MsgBox, 48, Ошибка, Окно виджета "%WindowTitle%" не найдено!`nУбедитесь, что вкладка DonationAlerts открыта в вашем браузере.
    }
return

; Возврат фокуса на предыдущее приложение
ReturnFocus:
    if (activeWindow) {
        WinActivate, ahk_id %activeWindow%
    }
return

ExitApp:
    ExitApp
return

GuiClose:
    Gui, Hide
    Gosub, LoadSettings
    Gosub, SetHotkeys
return
