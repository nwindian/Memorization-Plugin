import { App, Editor, MarkdownView, Modal, FrontMatterCache, Plugin, PluginSettingTab, Setting, View, Workspace, WorkspaceLeaf, getAllTags, MetadataCache, CachedMetadata, TagCache, TAbstractFile, TFile, FileManager } from 'obsidian';
import { PromptModal } from 'src/Modals/PromptModal';
import { Notes } from 'src/Models/Notes';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

const REGEXREMOVE = /\n?---[\s\S]*?---\n?|\n?>(?=#)/g;

export default class Learning extends Plugin {
	settings: MyPluginSettings;
	private notes: Array<Notes>;
	private suggestionResults: any | null
	private currentLearningNote: number
	private filteredTitles: any
	private currentScore: string
	private dateScoreChanges: string
	private previousDateScoreChange: string
	private previousEF: string
  private repetitions: string
  private interval: string

	async onload() {
		console.log('loading plugin - memorize')
		await this.loadSettings();
		this.currentLearningNote = 0
    this.interval = '0'
		this.currentScore = '0'
		this.previousEF = '2.5'
    this.repetitions = '0'
    console.log("reps: "+ this.repetitions)
		this.notes = []

		this.app.workspace.onLayoutReady( () => {
				const files =  this.app.vault.getMarkdownFiles()
				let notes: Notes[] = [];

				let i = 0;
				 files.forEach( (file) => {
					const cache = this.app.metadataCache.getCache(file.path)
					const tags = getAllTags(cache as CachedMetadata)

					notes.push({ id: i, tags: tags, title: file.path, path: this.app.vault.getResourcePath(file)})
					i++
				 })

				 this.notes = notes
		})

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('star', 'Learning', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			this.suggestionResults = await new PromptModal(this.app, this.notes).open()
      console.log(this.suggestionResults)
			// const filteredTitles =	this.suggestionResults.titles.filter((str: string) => !str.includes("[Memorize-Plugin]"));
			this.filteredTitles = this.shuffleArray(this.suggestionResults.titles)

			if(this.suggestionResults) {
				this.processModalChoice()
			}
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection('Sample Editor Command');
			}
		});

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						// const modal = new PromptModal(this.app, this.notes)
						// modal.open()
						// console.log(modal)
						// console.log(modal.getStuff())
						// console.log("hm: " + modal.stuff)
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', async (evt: PointerEvent) => {
			const element = evt.composedPath()[0] as HTMLInputElement;
			if(element.id.contains("memorize-plugin-radio")){
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
					const file = activeView.file;

					let content = await this.app.vault.read(file)
					let finalContent = ""

					if (content.includes('memorize-plugin-score')){
						const regexRemove = /\n?---[\s\S]*?---\n?|\n?>(?=#)/g;

						this.dateScoreChanges = new Date().toISOString()
						console.log(this)
            console.log("reps1: "+ this.repetitions)
						finalContent = content.replace(REGEXREMOVE, `\n---\nmemorize-plugin-ef:${this.previousEF}\nmemorize-plugin-score:${element.value}\nmemorize-plugin-current-date:${this.dateScoreChanges}\nmemorize-plugin-previous-date:${this.previousDateScoreChange}\nmemorize-plugin-repetitions:${this.repetitions}\nmemorize-plugin-interval:${this.interval}\n---\n`);
					} else {
						const date = new Date().toISOString()
            console.log("reps2: "+ this.repetitions)
						finalContent = `\n---\nmemorize-plugin-ef:${this.previousEF}\nmemorize-plugin-score:${element.value}\nmemorize-plugin-current-date:${date}\nmemorize-plugin-previous-date:${date}\nmemorize-plugin-repetitions:${this.repetitions}\nmemorize-plugin-interval:${this.interval}\n---\n` + content
						this.previousDateScoreChange = date
					}
					
					this.currentScore = element.value
					this.app.vault.modify(file, finalContent)
				}
			} 
			else if (element.id.contains("memorize-plugin-button")) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
          const file = activeView.file;
          let content = await this.app.vault.read(file)
          const regex = /\n?---[\s\S]*?---\n?|\n?>(?=#)/g;
          console.log("reps3: "+ this.repetitions)
          const finalContent = content.replace(REGEXREMOVE, `\n---\nmemorize-plugin-ef:${this.previousEF}\nmemorize-plugin-score:${element.value}\nmemorize-plugin-current-date:${this.dateScoreChanges}\nmemorize-plugin-previous-date:${this.previousDateScoreChange}\nmemorize-plugin-repetitions:${parseInt(this.repetitions, 10)}\nmemorize-plugin-interval:${this.interval}\n---\n`);

          this.app.vault.modify(file, finalContent)
          this.calculateSuperMemoEF()
          this.processModalChoice()
        }
      }
		});
		
		this.registerEvent(
			this.app.workspace.on('file-open', this.onFileOpen)
		)

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	calculateSuperMemoEF() {
    const repetitions = parseInt(this.repetitions, 10)
    const quality = parseInt(this.currentScore, 10)
    const interval = parseInt(this.interval, 10)
    let ef = parseFloat(this.previousEF)
    ef = parseFloat(ef.toFixed(1))
    if(quality >= 3){
      if(repetitions === 0){
        this.interval = '1'
      } else if (repetitions === 1){
        this.interval = '6'
      } else if (repetitions > 1){
        const i = Math.ceil(interval * ef);
        this.interval = i.toString()
      }

      this.repetitions = (repetitions + 1).toString()
      this.previousEF = (ef + (.1 - (5 - quality) * (.08 + (5 - quality) * .02))).toFixed(1)
    } else {
      this.repetitions = '0'
      this.interval = '1'
    }
    if (ef < 1.3){
      this.previousEF = '1.3'
    }
		// console.log("calculate")
		// console.log(this.dateScoreChanges)
		// console.log(this.previousDateScoreChange)
		// console.log(this.currentScore)
    // console.log(this.previousEF)
	}

	shuffleArray(array: string[]): string[] {
		// Create a copy of the original array
		const shuffledArray = [...array];
	  
		// Perform Fisher-Yates shuffle
		for (let i = shuffledArray.length - 1; i > 0; i--) {
		  const j = Math.floor(Math.random() * (i + 1));
		  [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
		}
	  
		return shuffledArray;
	}

	async processModalChoice() {
		let fileName = ""
		if (this.currentLearningNote < this.filteredTitles.length - 1){
			fileName = this.filteredTitles[this.currentLearningNote];
			await this.constructLearningNote(false, fileName)

			this.currentLearningNote += 1
		} else {
			fileName = this.filteredTitles[this.currentLearningNote];
			await this.constructLearningNote(true, fileName)

			this.currentLearningNote = 0
		}
	}

	async constructLearningNote(isLastNote: boolean, fileName: string) {
		if (!isLastNote) {
			const lastPeriodIndex = fileName.lastIndexOf(".");
			if (lastPeriodIndex !== -1) {
				const beforePeriod = fileName.slice(0, lastPeriodIndex);

				fileName = `[Memorize-Plugin]-${beforePeriod}${fileName.slice(lastPeriodIndex)}`;
			}

			const originalFile = this.app.vault.getAbstractFileByPath(this.filteredTitles[this.currentLearningNote])

			let content = await this.app.vault.read(originalFile as TFile)
			const formattedContent = content.replace(/[\r\n]+/g, '\n>')


			content = '>[!INFO]- ' + formattedContent
			content += '\n\n\n\n<form id="learning_level">\
			<input type="radio" id="memorize-plugin-radio-option0" name="radioOptions" value="0">\
			<label for="memorize-plugin-radio-option0">0</label>\
			<br>\
			<input type="radio" id="memorize-plugin-radio-option1" name="radioOptions" value="1">\
			<label for="memorize-plugin-radio-option1">1</label>\
			<br>\
			<input type="radio" id="memorize-plugin-radio-option2" name="radioOptions" value="2">\
			<label for="memorize-plugin-radio-option2">2</label>\
			<br>\
			<input type="radio" id="memorize-plugin-radio-option3" name="radioOptions" value="3">\
			<label for="memorize-plugin-radio-option3">3</label>\
			<br>\
			<input type="radio" id="memorize-plugin-radio-option4" name="radioOptions" value="4">\
			<label for="memorize-plugin-radio-option4">4</label>\
      <br>\
      <input type="radio" id="memorize-plugin-radio-option5" name="radioOptions" value="5">\
      <label for="option5">5</label>\
			</form> \
			<input id="memorize-plugin-button" value="Next" type="button"/>'


			try {
				const regex = /\n?---[\s\S]*?---\n?|\n?>(?=#)/g;

				const updatedStr = content.replace(regex, "");
				this.dateScoreChanges = new Date().toISOString()
				this.previousDateScoreChange = this.dateScoreChanges
				const frontmatter = `\n---\nmemorize-plugin-ef:${this.previousEF}\nmemorize-plugin-score:0\nmemorize-plugin-current-date:${this.dateScoreChanges}\nmemorize-plugin-previous-date:${this.previousDateScoreChange}\nmemorize-plugin-repetitions:0\nmemorize-plugin-interval:${this.interval}\n---\n`
				const updatedContent = frontmatter + updatedStr

				await this.app.vault.create(fileName, updatedContent)
				await this.app.workspace.openLinkText(fileName, fileName, true, { state: { mode: 'preview' } })
			}
			catch(error) {
				console.log("already created: " + error)
				await this.app.workspace.openLinkText(fileName, fileName, false, { state: { mode: 'preview' } })
			}
		} else {
			const lastPeriodIndex = fileName.lastIndexOf(".");
			if (lastPeriodIndex !== -1) {
				const beforePeriod = fileName.slice(0, lastPeriodIndex);

				fileName = `[Memorize-Plugin]-${beforePeriod}${fileName.slice(lastPeriodIndex)}`;
			}

			const originalFile = this.app.vault.getAbstractFileByPath(this.filteredTitles[this.currentLearningNote])

			let content = await this.app.vault.read(originalFile as TFile)
			const formattedContent = content.replace(/[\r\n]+/g, '\n>')

			content = '>[!INFO]- ' + formattedContent
			content += '\n\n\n\n<form id="learning_level">\
				<input type="radio" id="memorize-plugin-radio-option0" name="radioOptions" value="0">\
				<label for="option0">0</label>\
				<br>\
				<input type="radio" id="memorize-plugin-radio-option1" name="radioOptions" value="1">\
				<label for="option1">1</label>\
				<br>\
				<input type="radio" id="memorize-plugin-radio-option2" name="radioOptions" value="2">\
				<label for="option2">2</label>\
				<br>\
				<input type="radio" id="memorize-plugin-radio-option3" name="radioOptions" value="3">\
				<label for="option3">3</label>\
				<br>\
				<input type="radio" id="memorize-plugin-radio-option4" name="radioOptions" value="4">\
				<label for="option4">4</label>\
				<br>\
				<input type="radio" id="memorize-plugin-radio-option5" name="radioOptions" value="5">\
				<label for="option5">5</label>\
				</form>\
				<input id="memorize-plugin-button" value="Next" type="button"/>'

			try {
				const regex = /\n?---[\s\S]*?---\n?|\n?>(?=#)/g;
				const updatedStr = content.replace(regex, "");
				this.dateScoreChanges = new Date().toISOString()
				this.previousDateScoreChange = this.dateScoreChanges
        console.log("interval: "+ this.interval)
				const frontmatter = `\n---\nmemorize-plugin-ef:${this.previousEF}\nmemorize-plugin-score:0\nmemorize-plugin-current-date:${this.dateScoreChanges}\nmemorize-plugin-previous-date:${this.previousDateScoreChange}\nmemorize-plugin-repetitions:${this.repetitions}\nmemorize-plugin-interval:${this.interval}\n---\n`
				const updatedContent = frontmatter + updatedStr
				await this.app.vault.create(fileName, updatedContent)

				await this.app.workspace.openLinkText(fileName, fileName, true, { state: { mode: 'preview' } })
			}
			catch(error) {
				console.log("already created: " + error)
				await this.app.workspace.openLinkText(fileName, fileName, false, { state: { mode: 'preview' } })
			}
		}
	}

	onFileOpen = async (file: TFile) => {
		console.log("file opened")
		if (file.name.contains("[Memorize-Plugin]")){
			const scoreRegex = /memorize-plugin-score:\s*(\d+)/;
			const prevDateRegex = /memorize-plugin-previous-date:(.*)/;
			const curDateRegex = /memorize-plugin-current-date:(.*)/;
			const efRegex = /memorize-plugin-ef:\s*(\d+)/;
      const repetitionsRegex = /memorize-plugin-repetitions:(\d+)/
      const intervalRegex = /memorize-plugin-interval:(\d+)/

			const contents = await this.app.vault.read(file)

			if (contents.contains("memorize-plugin-ef")) {
				// Use the match method to extract the value
				const match = contents.match(scoreRegex);
				const dateMatch = contents.match(curDateRegex)
				const prevDateMatch = contents.match(prevDateRegex)
				const efMatch = contents.match(efRegex)
        const repetitionsMatch = contents.match(repetitionsRegex)
        const intervalMatch = contents.match(intervalRegex)

        const startIndexCurDate = contents.indexOf("memorize-plugin-current-date:");

				this.currentScore = (match && match[1]) as string; // Access the first captured group

				const prevDate = (prevDateMatch && prevDateMatch[1]) as string;
				const currentDate = (dateMatch && dateMatch[1]) as string;

        console.log("reps4: " + (repetitionsMatch && repetitionsMatch[1]) as string)
        this.interval = (intervalMatch && intervalMatch[1]) as string;
        this.repetitions = (repetitionsMatch && repetitionsMatch[1]) as string;
				this.previousDateScoreChange = new Date(prevDate).toISOString()
				this.dateScoreChanges = new Date(currentDate).toISOString()
				this.previousEF = (efMatch && efMatch[1]) as string;
			}
		}
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: Learning;

	constructor(app: App, plugin: Learning) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
