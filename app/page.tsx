// app/page.tsx 内のフォーム生成部分
<form onSubmit={handleSubmit} className="space-y-4">
  {/* 既存の現場・車両等の選択欄 */}
  
  {/* 動的生成エリア */}
  {settings.customFields?.map((field: any, idx: number) => (
    <div key={idx} className="bg-white p-4 rounded-2xl border shadow-sm">
      <label className="font-bold block mb-2">{field.name}</label>
      {field.type === 'file' ? (
        <input type="file" onChange={(e) => {/* 画像アップロード処理 */}} className="w-full" />
      ) : (
        <input 
          type={field.type} 
          placeholder={field.name}
          className="w-full p-3 border rounded-xl"
          onChange={(e) => {/* データ格納処理 */}}
        />
      )}
    </div>
  ))}
  
  <button type="submit" className="w-full bg-[#E56312] text-white font-black py-4 rounded-2xl">📩 送信する</button>
</form>
