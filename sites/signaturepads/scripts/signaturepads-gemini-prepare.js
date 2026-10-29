async (page) => {
 await page.bringToFront();
 const {task,prompt,lastSentAt}=__SIGNATUREPADS_INPUT__;
 if(!/^https:\/\/gemini\.google\.com\/u\/[2-6]\/app(?:$|\/)/.test(page.url()))throw Error('Wrong Gemini account URL');
 if(lastSentAt&&Date.now()-Date.parse(lastSentAt)<120000)throw Error('Wait at least two minutes between sends');
 const mode=page.locator('[data-test-id="bard-mode-menu-button"]');
 if(!/Argon/.test(await mode.getAttribute('aria-label')))throw Error('Argon not selected');
 if(await mode.getAttribute('aria-expanded')!=='true')await mode.evaluate(e=>e.click());await page.waitForTimeout(350);
 const argon=page.locator('[role=menuitem]').filter({hasText:'4 Argon'});if(!await argon.count())throw Error('4 Argon menu option missing');
 const thinking=page.locator('[role=menuitem][value="thinking_level"]');await thinking.evaluate(e=>e.click());await page.waitForTimeout(200);
 const low=page.locator('[role=menuitem]').filter({hasText:'Low'});
 if(!(await low.getAttribute('class')).includes('selected'))await low.evaluate(e=>e.click());else{await page.keyboard.press('Escape');await page.keyboard.press('Escape');}
 if(!/Argon/.test(await mode.getAttribute('aria-label')))throw Error('Model changed during setup');
 await page.getByRole('textbox',{name:'Enter a prompt for Gemini'}).fill(prompt,{force:true});
 const evidence={id:task.id,path:task.path,preparedAt:new Date().toISOString(),account:'/u/'+page.url().match(/\/u\/(\d+)/)[1],model:'4 Argon',thinking:'LOW',templateSha256:task.templateSha256,promptSha256:task.promptSha256};
 return {...evidence,promptCharacters:prompt.length,readyToSend:true};
}
