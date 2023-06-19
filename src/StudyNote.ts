import { App, MarkdownView, TFile, TAbstractFile } from 'obsidian'

export const DIRECTORYPATH = './MemorizationPlugin/'
const PATH = 'MemorizationPlugin/'

export class StudyNote {
  public interval: number;
  private app: App
  private title: string;
  private content: string;
  private efScore: string;
  private repetition: string;
  private dateIntervalSet: string;
  private quality: string;
  private originalTitle: string
  private path: string
  private file: TFile

  constructor(app: App, title: string, path: string) {
    this.originalTitle = title
    this.title = '[Memorization-Plugin]-' + title;
    this.path = PATH + this.title
    this.app = app
    this.efScore = '2.5'
    this.interval = 0
    this.repetition = '0'
    this.dateIntervalSet = '0'
    this.quality = '0'

    this.createStudyNote()
  }

  async createStudyNote() {
    const originalFile = this.app.vault.getAbstractFileByPath(this.originalTitle)
    let content = await this.app.vault.read(originalFile as TFile)

    const formattedContent = content.replace(/[\r\n]+/g, '\n>')
    const finalFormattedContent = formattedContent.replace(/#\S+/g, "");

    content = '\n#MemorizationPlugin\n>[!INFO]- \n>' + finalFormattedContent
    content += '\n\n\n\n<form id="learning_level">\
    <input type="radio" id="memorize-plugin-radio-option0" name="radioOptions" value="0">\
    <label for="memorize-plugin-radio-option0">0 - No clue.</label>\
    <br>\
    <input type="radio" id="memorize-plugin-radio-option1" name="radioOptions" value="1">\
    <label for="memorize-plugin-radio-option1">1 - You have the slightest clue.</label>\
    <br>\
    <input type="radio" id="memorize-plugin-radio-option2" name="radioOptions" value="2">\
    <label for="memorize-plugin-radio-option2">2 - You have some recollection of this note.</label>\
    <br>\
    <input type="radio" id="memorize-plugin-radio-option3" name="radioOptions" value="3">\
    <label for="memorize-plugin-radio-option3">3 - You remembered this note, but it was difficult.</label>\
    <br>\
    <input type="radio" id="memorize-plugin-radio-option4" name="radioOptions" value="4">\
    <label for="memorize-plugin-radio-option4">4 - You semi-confidently remembered this note.</label>\
    <br>\
    <input type="radio" id="memorize-plugin-radio-option5" name="radioOptions" value="5">\
    <label for="option5">5 - That was easy.</label>\
    </form><br /><br />\
    <input id="memorize-plugin-button" value="Next" type="button"/><br /> \
    <label style="font-weight: bold; font-size: 16px;" for="memorize-plugin-button">Note: To study another tag or note, you must select a tag from the Memorization plugin search bar.</label>'


    try {
      const regex = /\n?---[\s\S]*?---\n?|\n?>(?=#)/g;

      const updatedStr = content.replace(regex, "");

      const frontmatter = `\n---\nmemorize-plugin-ef:${this.efScore}\nmemorize-plugin-score:0\nmemorize-plugin-current-date:${this.dateIntervalSet}\nmemorize-plugin-previous-date:${this.dateIntervalSet}\nmemorize-plugin-repetitions:${this.repetition}\nmemorize-plugin-interval:${this.interval}\n---\n`
      const updatedContent = frontmatter + updatedStr
      this.content = updatedContent

      this.file = await this.app.vault.create(this.path, updatedContent)
      const file = this.app.vault.getAbstractFileByPath(this.path);
      if(file) {
        file.name = this.title
      }
    }
    catch(error) {
      this.loadFile()
    }    
  }

  deleteNote() {
    const file = this.app.vault.getAbstractFileByPath(this.path)
    this.app.vault.delete(file as TAbstractFile)
  }

  private async loadFile() {
    const scoreRegex = /memorize-plugin-score:\s*(\d+)/;
    const prevDateRegex = /memorize-plugin-previous-date:(.*)/;
    const curDateRegex = /memorize-plugin-current-date:(.*)/;
    const efRegex = /memorize-plugin-ef:\s*(\d+)/;
    const repetitionsRegex = /memorize-plugin-repetitions:(\d+)/
    const intervalRegex = /memorize-plugin-interval:(\d+)/


    const originalFile = this.app.vault.getAbstractFileByPath(this.path)
		this.content = await this.app.vault.read(originalFile as TFile)
    const contents = this.content

    const match = contents.match(scoreRegex);
    const dateMatch = contents.match(curDateRegex)
    const prevDateMatch = contents.match(prevDateRegex)
    const efMatch = contents.match(efRegex)
    const repetitionsMatch = contents.match(repetitionsRegex)
    const intervalMatch = contents.match(intervalRegex)

    this.efScore = (efMatch && efMatch[1]) as string;
    this.quality = (match && match[1]) as string;
    const interval = (intervalMatch && intervalMatch[1]) as string;
    this.interval = parseInt(interval)
    this.repetition = (repetitionsMatch && repetitionsMatch[1]) as string;

    const noteDate = (dateMatch && dateMatch[1]) as string;
    this.dateIntervalSet = noteDate

    const dateIntervalSet = new Date(noteDate)
    const today = new Date()
    const difference = today.getTime() - dateIntervalSet.getTime()
    const diffInDays = Math.floor(difference / (1000 * 60 * 60 * 24));
    if(diffInDays < 0) {
      this.interval = diffInDays
    }
  }

	calculateSuperMemoEF() {
		const repetitions = parseInt(this.repetition, 10)
		const quality = parseInt(this.quality, 10)
		let ef = parseFloat(this.efScore)
		ef = parseFloat(ef.toFixed(1))

		if(quality >= 3){
      if(repetitions === 0){
        this.interval = 1
      } else if (repetitions === 1){
        this.interval = 6
      } else if (repetitions > 1){
        const i = Math.ceil(this.interval * ef);
        this.interval = i
      }

      this.repetition = (repetitions + 1).toString()
      this.efScore = (ef + (.1 - (5 - quality) * (.08 + (5 - quality) * .02))).toFixed(1)
		} else {
	    this.repetition = '0'
		  this.interval = 1
		}
		if (ef < 1.3){
		  this.efScore = '1.3'
		}
	}

  updateNoteText() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      const file = activeView.file
      const abstractFile = this.app.vault.getAbstractFileByPath(this.title)

      this.calculateSuperMemoEF()
      const regex = /\n?---[\s\S]*?---\n?|\n?>(?=#)/g;
  
      const finalContent = this.content.replace(regex, `\n---\nmemorize-plugin-ef:${this.efScore}\nmemorize-plugin-score:${this.quality}\nmemorize-plugin-current-date:${this.dateIntervalSet}\nmemorize-plugin-previous-date:${this.dateIntervalSet}\nmemorize-plugin-repetitions:${this.repetition}\nmemorize-plugin-interval:${this.interval}\n---\n`);
      this.content = finalContent
  
      if(file){
        this.app.vault.modify(file, finalContent)
      } else {
        this.app.vault.modify(abstractFile as TFile, finalContent)
      }
    }
  }

  setQuality(quality: string) {
    this.quality = quality
    this.dateIntervalSet = new Date().toISOString()
  }

  async display(createTabs: boolean): Promise<void> {
    await this.app.workspace.openLinkText(this.path as string, this.path as string, createTabs, { state: { mode: 'preview' } })

    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      const viewState = activeView.getState();
      viewState.mode = 'preview';
      activeView.setState(viewState, {});
    }
  }
}
