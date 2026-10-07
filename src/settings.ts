import {App,Notice,PluginSettingTab,Setting} from 'obsidian';
import type PassagePractice from './main';
import type {SchedulingAlgorithm} from './spaced-repetition';
export class PracticeSettingTab extends PluginSettingTab {
 constructor(app:App,private host:PassagePractice){super(app,host);}
 display(){const root=this.containerEl;root.empty();root.createEl('h2',{text:'回想练习'});const store=this.host.store;
  if(!store){root.createEl('p',{text:this.host.storageError||'卡片存储尚未就绪'});return;}
  new Setting(root).setName('复习算法').setDesc('切换只保存偏好，现有到期时间和评分历史保留。下次真实评分才开始所选算法的新调度阶段。').addDropdown(drop=>{
   drop.addOption('fsrs','FSRS · 记忆模型').addOption('sm2-osr','Spaced Repetition · 按天').setValue(store.schedulingAlgorithm).onChange(async(value)=>{
    drop.setDisabled(true);try{await store.setSchedulingAlgorithm(value as SchedulingAlgorithm);this.host.refreshStudyViews();new Notice('已保存复习算法，原到期时间和历史保留');}catch(error){new Notice(error instanceof Error?error.message:'算法保存失败');}finally{drop.setValue(store.schedulingAlgorithm);drop.setDisabled(false);}
   });
  });
  root.createEl('p',{text:'FSRS 使用记忆模型；Spaced Repetition 使用 SM-2-OSR 默认公式，按本地日期计算到期。按天模式「忘了」今天到期；可在侧栏学习选项中启用本轮再练一次。'});
 }
}
