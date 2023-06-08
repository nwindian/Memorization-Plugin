import { App, Editor, MarkdownView, Modal, FrontMatterCache, Plugin, PluginSettingTab, Setting, View, Workspace, WorkspaceLeaf, getAllTags, MetadataCache, CachedMetadata, TagCache, TAbstractFile, TFile } from 'obsidian';
import { PromptModal } from 'src/Modals/PromptModal';
import { Notes } from 'src/Models/Notes';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class Learning extends Plugin {
	settings: MyPluginSettings;
	private notes: Array<Notes>;
	private suggestionResults: any | null
	private currentLearningNote: number
	private filteredTitles: any

	async onload() {
		console.log('loading plugin - Learning')
		await this.loadSettings();
		this.currentLearningNote = 0
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
			this.filteredTitles =	this.suggestionResults.titles.filter((str: string) => !str.includes("[Learning-Plugin]"));
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
			if(element.id.contains("learning-plugin-radio")){
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
					const file = activeView.file;

					let content = await this.app.vault.read(file)
					let finalContent = ""

					if (content.includes('learning-plugin-score')){
						const regex = /#learning-plugin-score-\d+/g
						const regexDate = /#learning-plugin-date-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/

						finalContent = content.replace(regex, `#learning-plugin-score-${element.value}`)
						finalContent = finalContent.replace(regexDate, `#learning-plugin-date-${new Date().toISOString().replace(/[:]/g, '-').replace(/\./g, '-')}`)	
					} else {
						finalContent = content + `\n\n\n #learning-plugin-score-${element.value} #learning-plugin-date-${new Date().toISOString().replace(/[:]/g, '-').replace(/\./g, '-')}`
					}
					
					this.app.vault.modify(file, finalContent)
				}
			} 
			else if (element.id.contains("learning-plugin-button")) {
        		this.processModalChoice()
      		}
		});
		
		this.registerEvent(
			this.app.workspace.on('file-open', this.onFileOpen)
		)

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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
			
				fileName = `[Learning-Plugin]-${beforePeriod}${fileName.slice(lastPeriodIndex)}`;
			}
		
			const originalFile = this.app.vault.getAbstractFileByPath(this.filteredTitles[this.currentLearningNote])
		
			let content = await this.app.vault.read(originalFile as TFile)
			const formattedContent = content.replace(/[\r\n]+/g, '\n>')
		
			content = '>[!INFO]- ' + formattedContent
			content += '\n\n\n\n<form id="learning_level">\
			<input type="radio" id="learning-plugin-radio-option0" name="radioOptions" value="0" onchange="()=>{console.log("clicked")}">\
			<label for="option0">0</label>\
			<br>\
			<input type="radio" id="learning-plugin-radio-option1" name="radioOptions" value="1" onchange="handleRadioChange(this)">\
			<label for="option1">1</label>\
			<br>\
			<input type="radio" id="learning-plugin-radio-option2" name="radioOptions" value="2" onchange="handleRadioChange(this)">\
			<label for="option2">2</label>\
			<br>\
			<input type="radio" id="learning-plugin-radio-option3" name="radioOptions" value="3" onchange="handleRadioChange(this)">\
			<label for="option3">3</label>\
			<br>\
			<input type="radio" id="learning-plugin-radio-option4" name="radioOptions" value="4" onchange="handleRadioChange(this)">\
			<label for="option4">4</label>\
			</form> \
			<input id="learning-plugin-button" value="Next" type="button"/>'
		
			
			try { 
				await this.app.vault.create(fileName, content)
				await this.app.workspace.openLinkText(fileName, fileName, true, { state: { mode: 'preview' } })
			}
			catch(error) {
				await this.app.workspace.openLinkText(fileName, fileName, false, { state: { mode: 'preview' } })
			}
		} else {
			const lastPeriodIndex = fileName.lastIndexOf(".");
			if (lastPeriodIndex !== -1) {
				const beforePeriod = fileName.slice(0, lastPeriodIndex);
			
				fileName = `[Learning-Plugin]-${beforePeriod}${fileName.slice(lastPeriodIndex)}`;
			}
		
			const originalFile = this.app.vault.getAbstractFileByPath(this.filteredTitles[this.currentLearningNote])
		
			let content = await this.app.vault.read(originalFile as TFile)
			const formattedContent = content.replace(/[\r\n]+/g, '\n>')
		
			content = '>[!INFO]- ' + formattedContent
			content += '\n\n\n\n<form id="learning_level">\
			<input type="radio" id="learning-plugin-radio-option0" name="radioOptions" value="0" onchange="()=>{console.log("clicked")}">\
			<label for="option0">0</label>\
			<br>\
			<input type="radio" id="learning-plugin-radio-option1" name="radioOptions" value="1" onchange="handleRadioChange(this)">\
			<label for="option1">1</label>\
			<br>\
			<input type="radio" id="learning-plugin-radio-option2" name="radioOptions" value="2" onchange="handleRadioChange(this)">\
			<label for="option2">2</label>\
			<br>\
			<input type="radio" id="learning-plugin-radio-option3" name="radioOptions" value="3" onchange="handleRadioChange(this)">\
			<label for="option3">3</label>\
			<br>\
			<input type="radio" id="learning-plugin-radio-option4" name="radioOptions" value="4" onchange="handleRadioChange(this)">\
			<label for="option4">4</label>\
			</form>\
			<input id="learning-plugin-button" value="Next" type="button"/>'
		
			
			try { 
				await this.app.vault.create(fileName, content)
				await this.app.workspace.openLinkText(fileName, fileName, true, { state: { mode: 'preview' } })
			}
			catch(error) {
				await this.app.workspace.openLinkText(fileName, fileName, false, { state: { mode: 'preview' } })
			}
		}
	}

	onFileOpen = async (file: TFile) => {
		console.log("file opened")
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
