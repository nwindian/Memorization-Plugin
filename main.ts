import { App, normalizePath, MarkdownView, Plugin, PluginSettingTab, Setting,  getAllTags,  CachedMetadata } from 'obsidian';
import { PromptModal } from 'src/Modals/PromptModal';
import { Notes } from 'src/Models/Notes';
import { StudyNote } from 'src/StudyNote';

interface MemorizeSettings {
	deleteNotes: boolean;
  createTabs: boolean
}

const DEFAULT_SETTINGS: MemorizeSettings = {
	deleteNotes: false,
  createTabs: true
}

export default class Learning extends Plugin {
	settings: MemorizeSettings;
	private notes: Array<Notes>;
	private suggestionResults: any | null
	private currentLearningNoteIndex: number
  private currentLearningNote: StudyNote
  private studyNotes: StudyNote[]

	async onload() {
		console.log('loading plugin - Memorization')
		await this.loadSettings();

		this.currentLearningNoteIndex = 0
		this.notes = []
    this.studyNotes = []

		this.addRibbonIcon('brain-cog', 'Memorize Notes', async () => {
      const files =  this.app.vault.getMarkdownFiles()
      let notes: Notes[] = [];
      let i = 0
      files.forEach( (file) => {
        const cache = this.app.metadataCache.getCache(file.path)
        const tags = getAllTags(cache as CachedMetadata)

        notes.push({ id: i, tags: tags, title: file.path, path: this.app.vault.getResourcePath(file)})
        i++
      })

      this.notes = notes
			this.suggestionResults = await new PromptModal(this.app, this.notes).open()

			const p = this.suggestionResults.titlePaths[0].path
			const s = normalizePath(p)

      this.studyNotes = []
			for (const titlePath of this.suggestionResults.titlePaths) {
        const studyNote = new StudyNote(this.app, titlePath.title, normalizePath(titlePath.path))
        await studyNote.createStudyNote()
        this.studyNotes.push(studyNote)
			}

      this.studyNotes = this.studyNotes.sort((a, b) => a.interval - b.interval);

      this.currentLearningNote = this.studyNotes[this.currentLearningNoteIndex]
      this.studyNotes[this.currentLearningNoteIndex].display(this.settings.createTabs)
		});

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'PromptModal',
			name: 'Study tag',
			checkCallback: (checking: boolean) => {
        if (!checking) {
          (async () => {
            const files =  this.app.vault.getMarkdownFiles()
            let notes: Notes[] = [];
            let i = 0
            files.forEach( (file) => {
              const cache = this.app.metadataCache.getCache(file.path)
              const tags = getAllTags(cache as CachedMetadata)

              notes.push({ id: i, tags: tags, title: file.path, path: this.app.vault.getResourcePath(file)})
              i++
            })

            this.notes = notes
            this.suggestionResults = await new PromptModal(this.app, this.notes).open()

            this.studyNotes = []
            for (const titlePath of this.suggestionResults.titlePaths) {
              const studyNote = new StudyNote(this.app, titlePath.title, normalizePath(titlePath.path))
              await studyNote.createStudyNote()
              this.studyNotes.push(studyNote)
            }

            this.studyNotes = this.studyNotes.sort((a, b) => a.interval - b.interval);

            this.currentLearningNote = this.studyNotes[this.currentLearningNoteIndex]
            this.studyNotes[this.currentLearningNoteIndex].display(this.settings.createTabs)
          })();
        }

          return true
			}
		});

		this.addSettingTab(new MemorizeSettingTab(this.app, this));

		this.registerDomEvent(document, 'click', async (evt: PointerEvent) => {
			const element = evt.composedPath()[0] as HTMLInputElement;
			if(element.id.contains("memorize-plugin-radio")){
        this.currentLearningNote.setQuality(element.value)
			} else if (element.id.contains("memorize-plugin-button")) {
       	const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
          this.deleteOrUpdateNote()

          this.goToNextNote()
        }
      }
		});
	}

  deleteOrUpdateNote() {
    if(this.settings.deleteNotes){
      if(this.currentLearningNote){
        this.currentLearningNote.deleteNote()
        this.studyNotes.remove(this.currentLearningNote)
        this.currentLearningNoteIndex -= 1
      }
    } else {
      if(this.currentLearningNote){
        this.currentLearningNote.updateNoteText()
      }
    }
  }

  goToNextNote() {
    const nextIndex = this.currentLearningNoteIndex + 1
    if (nextIndex < this.studyNotes.length){
      this.currentLearningNoteIndex = nextIndex

      this.currentLearningNote = this.studyNotes[nextIndex]
      if(this.currentLearningNote){
        this.currentLearningNote.display(this.settings.createTabs)
      }
    } else {
      this.currentLearningNoteIndex = 0
      this.studyNotes = this.studyNotes.sort((a, b) => a.interval - b.interval);
      this.currentLearningNote = this.studyNotes[this.currentLearningNoteIndex]

      if(this.currentLearningNote){
        this.currentLearningNote.display(this.settings.createTabs)
      }
    }
  }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class MemorizeSettingTab extends PluginSettingTab {
	plugin: Learning;

	constructor(app: App, plugin: Learning) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings'});

		new Setting(containerEl)
			.setName('Delete memorization notes after creation')
			.setDesc('Note: this will disable the spaced repetition feature.')
			.addToggle((toggle) => toggle
      .setValue(this.plugin.settings.deleteNotes)
      .onChange(async (value) => {
        this.plugin.settings.deleteNotes = value
        await this.plugin.saveSettings()
      }))
    
      new Setting(containerEl)
			.setName('Enable creation of new tabs')
			.setDesc('By default, when you go to the next note in the sequence, a new tab is not created. Enable this if you\'d like a new tab created.')
			.addToggle((toggle) => toggle
      .setValue(this.plugin.settings.createTabs)
      .onChange(async (value) => {
        this.plugin.settings.createTabs = value
        await this.plugin.saveSettings()
      }))
	}
}
