self.addEventListener('notificationclick',event=>{
 event.notification.close();const target=event.notification.data?.target
 if(!target||!['plans','progress','social'].includes(target.page))return
 event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const client=windows.find(value=>new URL(value.url).origin===self.location.origin);if(client){await client.focus();client.postMessage({type:'fitsync-notification-open',target})}else await self.clients.openWindow('/?notification='+encodeURIComponent(JSON.stringify(target)))})())
})
