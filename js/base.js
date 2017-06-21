(function() {
	'use strict';		//使用严格模式

	var $form_add_task = $('.add-task'),
		$window = $(window),
		$body = $('body'),
		$task_delete_trigger,
		$task_detail_trigger,
		$task_detail = $('.task-detail'),
		$task_detail_mask = $('.task-detail-mask'),
		task_list = {},
		current_index,
		$update_form,
		$task_detail_content,
		$task_detail_content_input,
		$checkbox_complete,
		$msg = $('.msg'),
		$msg_content = $msg.find('.msg-content'),
		$msg_confirm = $msg.find('.confirmed'),
		$alerter = $('.alerter');


	init();

	/*	
	 * 绑定表单提交添加新任务事件
	 */
	$form_add_task.on('submit', on_add_task_form_submit);
	$task_detail_mask.on('click', hide_task_detail);

	/*
	 * 自定义一个弹出框
	 */
	function pop(arg){
		if (!arg) {
			console.error('pop title is required');
		}

		var conf = {}
			, $box
			, $mask
			, $title
			, $content
			, $confirm
			, $cancel
			, timer
			, dfd
			, confirmed
			;

		dfd = $.Deferred();

		if (typeof arg == 'string') {
			conf.title = arg;
		}else{
			conf = $.extend(conf, arg);
		}
		
		/* 设置弹出框样式 */
		$box = $('<div>' +
			'<div class="pop-title">' + conf.title + '</div>' +
			'<div class="pop-content">' +
			'<div>' +
			'<button style="margin-right: 5px;" class="primary confirm">确定</button>' +
			'<button class="cancel">取消</button>' +
			'</div>' +
			'</div>' +
			'</div>').css({
				color: '#444',
				position: 'fixed',
				width: 300,
				height: 'auto',
				padding: '10px 10px',
				background: '#fff',
				'border-radius': 3,
				'box-shadow': '0 1px 2px rgba(0, 0, 0, 0.5)'
		});

		$title = $box.find('.pop-title').css({
			padding: '5px 10px',
			'font-weight': 900,
			'font-size': 20,
			'text-align': 'center'
		});

		$content = $box.find('.pop-content').css({
			padding: '5px 10px',
			'text-align': 'center'
		});

		$confirm = $content.find('button.confirm');
		$cancel = $content.find('button.cancel');
		
		/* 设置遮罩层样式 */
		$mask = $('<div></div>').css({
			background: 'rgba(0, 0, 0, 0.5)',
			position: 'fixed',
			top: 0,
			right: 0,
			bottom: 0,
			left: 0
		});

		timer = setInterval(function(){
			if(confirmed !== undefined){
				dfd.resolve(confirmed);
				clearInterval(timer);
				dismiss_pop();
			}
		}, 50);

		$confirm.on('click', on_confirmed);	// 绑定单击确认按钮事件
		$cancel.on('click',  on_cancel);	// 绑定单击取消按钮事件
		$mask.on('click', on_cancel);		// 绑定单击遮罩层触发取消事件

		function on_confirmed() {
			confirmed = true;
		}

		function on_cancel() {
			confirmed = false;
		}

		function dismiss_pop(){
			$mask.remove();
			$box.remove();
		}

		/*
		 * 调整弹出框位置
		 */
		function adjust_box_position(){
			var window_width = $window.width(),	// 获取窗体宽度
				window_height = $window.height(),	// 获取窗体高度
				box_width = $box.width(),
				box_height = $box.height(),
				move_x,
				move_y;

			move_x = (window_width - box_width) / 2;
			move_y = ((window_height - box_height) / 2) - 20;

			$box.css({
				left: move_x,
				top: move_y
			});
		}		

		/*
		 * 当窗体大写改变时，调整弹出框位置
		 */
		$window.on('resize', function(){
			adjust_box_position();
		});

		$mask.appendTo($body);
		$box.appendTo($body);
		$window.resize();
		return dfd.promise();
	}

	/*
	 * 监听任务提醒
	 */
	function listen_msg_event(){
		$msg_confirm.on('click', function(){
			hide_msg();
		});
	}

	/*
	 * 添加新任务
	 */
	function on_add_task_form_submit(e){
		var new_task = {};
		/* 禁止默认行为 */
		e.preventDefault();
		/* 取到新任务的值 */
		var $input = $(this).find('input[name=content]');
		new_task.content = $input.val();

		/* 如果 task 的 value 为空，直接返回，否则执行下一步*/
		if (!new_task.content) return;
		/* 保存新任务 */
		if(add_task(new_task)){
			// render_task_list();
			$input.val('');
		}
	}

	/*
	 * 监听打开Task详情事件
	 */
	function listen_task_detail(){
		var index;
		$('.task-item').on('dblclick', function(){
			index = $(this).data('index');
			show_task_detail(index);
		});

		$task_detail_trigger.on('click', function(){
			var $this = $(this);
			/* 找到删除元素所在的task元素 */
			var $item = $this.parent().parent();
			index = $item.data('index');
			show_task_detail(index);
		});
	}

	/*
	 * 查看Task详情
	 */
	function show_task_detail(index){
		/* 生成详情模板 */
		render_task_detail(index);
		current_index = index;
		/* 显示详情模板，默认隐藏 */
		$task_detail.show();
		/* 显示详情模板遮罩层，默认隐藏 */
		$task_detail_mask.show();
	}

	/*
	 * 更新Task
	 */
	function update_task(index, data){
		if(!index || !task_list[index])	return;

		task_list[index] = $.extend({}, task_list[index], data);
		refresh_task_list();
	}

	/*
	 * 隐藏Task详情
	 */
	function hide_task_detail(){
		$task_detail.hide();
		$task_detail_mask.hide();
	}

	/*
	 * 渲染指定Task的详细信息
	 */
	function render_task_detail(index) {
		if (index === undefined || !task_list[index]) return;
		var item = task_list[index];
		var tpl =
			'<form>' +
			'<div class="content">' +
			item.content +
			'</div>' +
			'<div class="input-item">' +
			'<input style="display:none" type="text"name="content" value="' + (item.content || '') + '">' +
			'</div>' +
			'<div class="desc input-item">' +
			'<textarea name="desc">' + (item.desc || '') + '</textarea>' +
			'</div>' +
			'<div class="remind input-item">' +
			'<label>提醒时间</label>' +
			'<input class="datetime" name="remind_date" type="text" value="' + (item.remind_date || '') + '">' +
			'</div>' +
			'<div class="input-item"><button type="submit">更新</button></div>' +
			'</form>';

		/* 用新模板替换旧模板 */
		$task_detail.html(null);
		$task_detail.html(tpl);
		$('.datetime').datetimepicker();
		/* 选中其中的form元素，因为之后会使用其监听submit事件 */
		$update_form = $task_detail.find('form');
		/* 选中显示task内容的元素 */
		$task_detail_content = $update_form.find('.content');
		/* 选中显示task input 的元素 */
		$task_detail_content_input = $update_form.find('[name=content]');

		/* 双击内容元素显示input，隐藏自己 */
		$task_detail_content.on('dblclick', function() {
			$task_detail_content_input.show();
			$task_detail_content.hide();
		});

		$update_form.on('submit', function(e){
			e.preventDefault();
			var data = {};
			/* 获取表单中各个 input 的值 */
			data.content = $(this).find('[name=content]').val();
			data.desc = $(this).find('[name=desc]').val();
			data.remind_date = $(this).find('[name=remind_date]').val();
			update_task(index, data);
			hide_task_detail();
			
		});
	}

	/*
	 * 监听完成Task事件
	 */
	function listen_checkbox_complete(){
		$checkbox_complete.on('click', function() {
			var $this = $(this);
			// var is_complete = $this.is(':checked');
			var index = $this.parent().parent().data('index');
			var item = get(index);
			if (item.complete) {				
				update_task(index, {complete: false});
			}else{
				update_task(index, {complete: true});
			}
		});
	}

	function get(index) {
		return store.get('task_list')[index];
	}

	/*	
	 * 查找并监听所有删除按钮的点击事件
	 */
	function listen_task_delete(){
		$task_delete_trigger.on('click', function(){
			var $this = $(this);
			/* 找到删除元素所在的task元素 */
			var $item = $this.parent().parent();
			var index = $item.data('index');
			/* 确认是否删除 */
			pop("确定要删除吗？").then(function(r){
				r ? task_delete(index) : null;
			});		
		});
	}

	/*	
	 * 添加新任务
	 */
	function add_task(new_task){
		/* 将新的任务存入任务列表 */
		task_list.push(new_task);
		/* 更新本地存储（localStorage）*/
		refresh_task_list();
		return true;
	}

	/*
	 * 刷新localStorage数据并渲染模板
	 */
	function refresh_task_list(){
		store.set('task_list', task_list);
		render_task_list();
	}

	/* 
	 * 删除一条任务
	 */
	function task_delete(index){
		// 如果没有相应的index或者index不存在，则返回
		if (index === undefined || !task_list[index])	return;
		delete task_list[index];
		refresh_task_list();
	}

	/*
	 * 初始化
	 */
	function init(){
		// store.clear();
		task_list = store.get('task_list') || [];
		listen_msg_event();
		if (task_list.length) {
			render_task_list();		
			task_remind_check();
		}
	}

	/*
	 * 检测是否有任务需要提醒
	 */
	function task_remind_check(){
		/* 声明当前时间戳对象 */
		var curr_timestamp;
		/* 设置定时器监测任务提醒时间差 */
		var itl = setInterval(function(){
			for (var i = 0; i < task_list.length; i++) {
			 	var item = get(i), task_timestamp;
			 	if (!item || !item.remind_date || item.informed) continue;

			 	curr_timestamp = (new Date()).getTime();
			 	task_timestamp = (new Date(item.remind_date)).getTime();
			 	if (curr_timestamp - task_timestamp >= 1) {
			 		update_task(i, {informed: true});
		 			show_msg(item.content);			 		
			 	}
			}
		}, 300);
	}

	/*
	 * 显示提示信息
	 */
	function show_msg(msg){
		if (!msg) return;
		$msg_content.html(msg);
		$alerter.get(0).play();
		$msg.show();
	}

	/*
	 * 隐藏提示信息
	 */
	function hide_msg(){
		$msg.hide();
	}

	/*
	 * 渲染模板，显示任务列表
	 */
	function render_task_list(){
		var $task_list = $('.task-list');
		$task_list.html('');
		var complete_items = [];

		for (var i = 0; i < task_list.length; i++) {
			var item = task_list[i];
			if (item && item.complete) {
				complete_items[i] = item;
			}else{
				var $task = render_task_item(item, i);
				$task_list.prepend($task);
			}				
		}

		for(var j = 0; j < complete_items.length; j++){
			var $task = render_task_item(complete_items[j], j);
			if (!$task) continue;
			$task.addClass('completed');
			$task_list.append($task);
		}

		$task_delete_trigger = $('.action.delete');
		$task_detail_trigger = $('.action.detail');
		$checkbox_complete = $('.task-list .complete[type=checkbox]');
		listen_task_delete();
		listen_task_detail();
		listen_checkbox_complete();
	}

	/*
	 * 渲染模板，显示一条任务 
	 */
	function render_task_item(data, index){
		if(!data || !index)	return;
		var list_item_tpl = 
			"<div class='task-item' data-index='" + index + "'>" +
			"<span><input class='complete'" + (data.complete ? 'checked' : '') + " type='checkbox'></span>" +
			"<span class='task-content'>" + data.content + "</span>" +
			"<span class='fr'>" +
			"<span class='action delete'>删除</span>" +
			"<span class='action detail'>详细</span>" +
			"</span>" +
			"</div>";
		return $(list_item_tpl);
	}
})();
